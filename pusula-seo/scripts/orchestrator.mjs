#!/usr/bin/env node
/**
 * The hourly entrypoint. Determines what's due right now from time-of-day
 * (Europe/Istanbul) + data/telegram-state.json, executes everything that's
 * purely deterministic itself (Telegram command processing, the daily
 * metrics pull, the weekly refresh scan, milestone checks), and returns a
 * `due` checklist of what still needs the agent's reasoning this run
 * (writing an article, narrating a report). See RUNBOOK.md for exactly how
 * the agent should act on each flag.
 *
 * Safe to run every hour: every action here is idempotent against
 * telegram-state.json's last_run timestamps, so re-running mid-day is a
 * no-op for anything already done today/this week.
 */
import path from 'node:path';
import { DATA_DIR, METRICS_HISTORY_DIR } from './lib/paths.mjs';
import { readJSON, writeJSON, appendJSONL } from './lib/json-store.mjs';
import { isMain } from './lib/cli.mjs';
import { processPendingTelegramInput } from './telegram/commands.mjs';
import { sendMessage } from './telegram/client.mjs';
import { formatMilestone, formatGscMilestoneEvent } from './telegram/format.mjs';
import { fetchGscPerformance } from './gsc/fetch-performance.mjs';
import { fetchGa4Metrics } from './ga4/fetch-metrics.mjs';
import { fetchPosthogMetrics } from './posthog/fetch-metrics.mjs';
import { detectGscMilestones } from './gsc/detect-milestones.mjs';
import { analyzeContent } from './refresh/analyze-content.mjs';
import { loadAllContent, isPublished } from './lib/content-index.mjs';

const STATE_PATH = path.join(DATA_DIR, 'telegram-state.json');
const MILESTONES_PATH = path.join(DATA_DIR, 'milestones.json');

export const CONFIG = {
  timezone: 'Europe/Istanbul',
  publishHour: 9,
  morningReportHour: 8,
  eveningSummaryHour: 21,
  weeklyWeekday: 'Mon' // refresh scan + advisor deep-dive
};

const MILESTONE_THRESHOLDS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

function istanbulNow() {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: CONFIG.timezone, hour: 'numeric', hour12: false, weekday: 'short' });
  const parts = fmt.formatToParts(new Date());
  return {
    hour: Number(parts.find((p) => p.type === 'hour').value) % 24,
    weekday: parts.find((p) => p.type === 'weekday').value
  };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function alreadyRanToday(iso) {
  return Boolean(iso) && iso.slice(0, 10) === todayStr();
}

function alreadyRanThisWeek(iso) {
  return Boolean(iso) && Date.now() - new Date(iso).getTime() < 7 * 86400000;
}

function checkMilestone(key, currentValue, seenMap) {
  const lastSeen = seenMap[key] || 0;
  const crossed = MILESTONE_THRESHOLDS.filter((t) => t > lastSeen && t <= currentValue);
  if (crossed.length === 0) return null;
  seenMap[key] = crossed[crossed.length - 1];
  return crossed[crossed.length - 1];
}

async function runDailyMetricsPull(state) {
  if (alreadyRanToday(state.last_run.gsc_pull)) return;

  const [gsc, ga4, posthog] = await Promise.all([
    fetchGscPerformance({ days: 1 }),
    fetchGa4Metrics({ days: 1 }),
    fetchPosthogMetrics({ days: 1 })
  ]);

  if (gsc.connected || ga4.connected || posthog.connected) {
    const published = loadAllContent().filter(isPublished);
    for (const item of published) {
      const pageStat = gsc.connected ? gsc.pages.find((p) => p.page.includes(item.slug)) : null;
      appendJSONL(path.join(METRICS_HISTORY_DIR, `${item.slug}.jsonl`), {
        date: todayStr(),
        clicks: pageStat?.clicks ?? null,
        impressions: pageStat?.impressions ?? null,
        ctr: pageStat?.ctr ?? null,
        position: pageStat?.position ?? null
      });
    }
  }

  state.last_run.gsc_pull = new Date().toISOString();
}

/**
 * Search Console milestones: new page indexed, first impression/click,
 * ranking improvements/drops, top-10 reached. Runs once a day (GSC data
 * has real reporting lag, no point checking hourly), always — regardless
 * of the `paused` flag, since detecting and celebrating what's already
 * happened isn't "automation" in the sense pause is meant to stop.
 * detectGscMilestones() itself guarantees no duplicate notifications.
 */
async function runGscMilestoneCheck(state) {
  if (alreadyRanToday(state.last_run.gsc_milestones)) return;

  const events = await detectGscMilestones();
  for (const event of events) {
    await sendMessage(formatGscMilestoneEvent(event));
  }

  state.last_run.gsc_milestones = new Date().toISOString();
}

async function runMilestoneCheck() {
  const published = loadAllContent().filter(isPublished);
  const milestonesFile = readJSON(MILESTONES_PATH);
  const crossed = checkMilestone('total_published', published.length, milestonesFile.seen);
  if (crossed) {
    await sendMessage(formatMilestone({
      metric: 'Toplam yayınlanan içerik',
      value: crossed,
      context: `Pusula içerik kütüphanesi ${crossed} yayına ulaştı.`
    }));
    writeJSON(MILESTONES_PATH, milestonesFile);
  }
}

export async function runOrchestratorTick() {
  const state = readJSON(STATE_PATH);
  const { hour, weekday } = istanbulNow();

  const due = {
    publishArticle: false,
    morningReport: false,
    eveningSummary: false,
    refreshScanRanNow: false,
    advisorDeepDive: false,
    agentActions: []
  };

  // 1. Telegram commands — always processed, even while paused.
  // processPendingTelegramInput() does its own read-modify-write cycle on
  // telegram-state.json (it needs to persist last_update_id/pending_commands
  // immediately, independent of the rest of this tick). Re-read afterward
  // rather than continuing to mutate the `state` object captured above —
  // otherwise this function's own writeJSON at the end would clobber that
  // update with the stale pre-poll copy.
  const { agentActions, processedCount } = await processPendingTelegramInput();
  due.agentActions.push(...agentActions);
  if (processedCount > 0) console.log(`Processed ${processedCount} Telegram update(s).`);
  Object.assign(state, readJSON(STATE_PATH));

  // 2. Daily metrics pull — always, regardless of pause (observing isn't automating).
  await runDailyMetricsPull(state);

  // 2.5. Search Console milestones — also always-on, same reasoning.
  await runGscMilestoneCheck(state);

  // 3. Scheduled content/report jobs — skipped while paused.
  if (!state.paused) {
    if (hour >= CONFIG.publishHour && !alreadyRanToday(state.last_run.new_article)) {
      due.publishArticle = true;
    }
    if (hour >= CONFIG.morningReportHour && !alreadyRanToday(state.last_run.morning_report)) {
      due.morningReport = true;
    }
    if (hour >= CONFIG.eveningSummaryHour && !alreadyRanToday(state.last_run.evening_summary)) {
      due.eveningSummary = true;
    }
    if (weekday === CONFIG.weeklyWeekday && !alreadyRanThisWeek(state.last_run.refresh_scan)) {
      analyzeContent(); // deterministic — run it now, agent narrates from refresh-queue.json
      state.last_run.refresh_scan = new Date().toISOString();
      due.refreshScanRanNow = true;
    }
    if (weekday === CONFIG.weeklyWeekday && !alreadyRanThisWeek(state.last_run.advisor_recommendations)) {
      due.advisorDeepDive = true; // agent runs generate-recommendations.mjs + narrates + sends
    }
  }

  // 4. Milestone check — always, cheap, local data.
  await runMilestoneCheck();

  writeJSON(STATE_PATH, state);
  return due;
}

if (isMain(import.meta.url)) {
  const due = await runOrchestratorTick();
  console.log(JSON.stringify(due, null, 2));
}
