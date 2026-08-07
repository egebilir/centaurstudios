/**
 * Command router for the Telegram assistant. Read-only and state-flip
 * commands are fully handled here — no agent reasoning needed. Commands
 * that need fresh reasoning (/publish) are acknowledged instantly and
 * returned as a `needsAgentAction`, which the orchestrator's RUNBOOK tells
 * the agent to actually carry out afterward in the same run.
 *
 * This module is intentionally dependency-light (no sharp/googleapis at the
 * top level beyond what the fetchers already isolate) so the same logic can
 * be ported to the optional Cloudflare Worker accelerator with minimal changes.
 */
import path from 'node:path';
import { DATA_DIR } from '../lib/paths.mjs';
import { readJSON, writeJSON } from '../lib/json-store.mjs';
import { loadAllContent, isPublished } from '../lib/content-index.mjs';
import { getUpdates, sendMessage } from './client.mjs';
import { formatReport, formatNotConnected } from './format.mjs';
import { fetchGscPerformance } from '../gsc/fetch-performance.mjs';
import { fetchGa4Metrics } from '../ga4/fetch-metrics.mjs';
import { fetchPosthogMetrics } from '../posthog/fetch-metrics.mjs';
import { generateRecommendations } from '../advisor/generate-recommendations.mjs';

const STATE_PATH = path.join(DATA_DIR, 'telegram-state.json');
const TOPICS_PATH = path.join(DATA_DIR, 'topics.json');
const REFRESH_QUEUE_PATH = path.join(DATA_DIR, 'refresh-queue.json');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function cmdToday() {
  const published = loadAllContent().filter(isPublished);
  const today = published.find((p) => p.published_date === todayStr());
  if (!today) {
    return formatReport({
      headline: 'Bugün henüz yeni içerik yayınlanmadı',
      bullets: [`Toplam yayında: ${published.length} içerik.`]
    });
  }
  return formatReport({
    headline: `Bugün yayınlanan: ${today.title}`,
    bullets: [`Küme: ${today.cluster}`, `Tür: ${today.content_type}`, `Slug: ${today.slug}`]
  });
}

async function cmdStats() {
  const [gsc, ga4, posthog] = await Promise.all([
    fetchGscPerformance({ days: 7 }),
    fetchGa4Metrics({ days: 7 }),
    fetchPosthogMetrics({ days: 7 })
  ]);

  const bullets = [];
  bullets.push(gsc.connected
    ? `GSC: ${gsc.current.clicks} tıklama, ${gsc.current.impressions} gösterim, ort. poz. ${gsc.current.avgPosition.toFixed(1)}`
    : formatNotConnected('Search Console'));
  bullets.push(ga4.connected
    ? `GA4: ${ga4.totalSessions} oturum (${ga4.organicSessions} organik)`
    : formatNotConnected('GA4'));
  bullets.push(posthog.connected
    ? `PostHog: dönüşüm oranı ${posthog.funnel.conversionRate != null ? (posthog.funnel.conversionRate * 100).toFixed(1) + '%' : 'veri yok'}`
    : formatNotConnected('PostHog'));

  return formatReport({ headline: 'Son 7 Gün — Özet', bullets });
}

async function cmdTop() {
  const ga4 = await fetchGa4Metrics({ days: 7 });
  if (!ga4.connected) {
    const published = loadAllContent().filter(isPublished);
    return formatReport({
      headline: 'En İyi Performans',
      bullets: [
        formatNotConnected('GA4/PostHog'),
        `Şu an ${published.length} içerik yayında, kümelere dağılım: ${
          [...new Set(published.map((p) => p.cluster))].join(', ')
        }`
      ]
    });
  }
  const top = ga4.topPages.slice(0, 5).map((p) => `${p.path} — ${p.views} görüntülenme`);
  return formatReport({ headline: 'En Çok Görüntülenen Sayfalar (7g)', bullets: top });
}

async function cmdSeo() {
  const advisor = await generateRecommendations();
  const top = advisor.recommendations.slice(0, 3).map((r) => ({ label: r.summary, impact_score: r.impact_score }));
  return formatReport({
    headline: `SEO Durumu — ${advisor.totalPublished} içerik yayında`,
    bullets: [advisor.gscConnected ? 'Search Console bağlı.' : formatNotConnected('Search Console')],
    topActions: top
  });
}

async function cmdIdeas() {
  const topicsFile = readJSON(TOPICS_PATH);
  const ideas = topicsFile.topics
    .filter((t) => t.status === 'pool')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
    .map((t) => `${t.primary_keyword} (${t.cluster}, öncelik ${t.priority})`);
  return formatReport({
    headline: 'Sıradaki Konu Önerileri',
    bullets: ideas.length ? ideas : ['Havuzda bekleyen konu kalmadı — genişletme gerekiyor.']
  });
}

async function cmdStatus() {
  const state = readJSON(STATE_PATH);
  const topicsFile = readJSON(TOPICS_PATH);
  const refreshFile = readJSON(REFRESH_QUEUE_PATH);
  const counts = topicsFile.topics.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return formatReport({
    headline: state.paused ? '⏸ Otomasyon Duraklatıldı' : '▶ Otomasyon Aktif',
    bullets: [
      `Havuz: ${counts.pool || 0} bekliyor, ${counts.queued || 0} sırada, ${counts.published || 0} yayında, ${counts.blocked || 0} engelli`,
      `Refresh kuyruğunda: ${refreshFile.candidates.length} aday`,
      `Son yayın: ${state.last_run.new_article || 'henüz yok'}`,
      `Son sabah raporu: ${state.last_run.morning_report || 'henüz yok'}`
    ]
  });
}

async function cmdPublish() {
  const state = readJSON(STATE_PATH);
  if (!state.pending_commands.includes('publish')) {
    state.pending_commands.push('publish');
    writeJSON(STATE_PATH, state);
  }
  return '⏳ Yeni içerik üretimi kuyruğa alındı — bu çalıştırma içinde tamamlanınca burada onaylayacağım.';
}

async function cmdPause() {
  const state = readJSON(STATE_PATH);
  state.paused = true;
  writeJSON(STATE_PATH, state);
  return '⏸ Otomasyon duraklatıldı. Planlı yayın ve refresh işleri durdu; komutlara yanıt vermeye devam ediyorum. /resume ile tekrar başlat.';
}

async function cmdResume() {
  const state = readJSON(STATE_PATH);
  state.paused = false;
  writeJSON(STATE_PATH, state);
  return '▶ Otomasyon devam ediyor.';
}

const HELP_TEXT = `Kullanılabilir komutlar:
/today — bugün yayınlanan içerik
/stats — son 7 gün özeti (GSC/GA4/PostHog)
/top — en iyi performans gösteren sayfalar
/seo — SEO durumu ve en öncelikli öneriler
/ideas — sıradaki konu önerileri
/status veya /health — pipeline durumu
/publish — hemen yeni içerik üret
/pause — otomasyonu duraklat
/resume — otomasyonu devam ettir`;

const HANDLERS = {
  '/today': cmdToday,
  '/stats': cmdStats,
  '/top': cmdTop,
  '/seo': cmdSeo,
  '/ideas': cmdIdeas,
  '/status': cmdStatus,
  '/health': cmdStatus,
  '/pause': cmdPause,
  '/resume': cmdResume,
  '/help': async () => HELP_TEXT,
  '/start': async () => HELP_TEXT
};

/** Routes one command string. /publish is special-cased: it's queued rather
 * than handled synchronously, since actually writing an article needs the
 * agent, not this script. */
export async function routeCommand(text) {
  const command = (text || '').trim().split(/\s+/)[0].toLowerCase();

  if (command === '/publish') {
    return { reply: await cmdPublish(), needsAgentAction: 'publish_now' };
  }

  const handler = HANDLERS[command];
  if (!handler) {
    return { reply: `Bilinmeyen komut: ${command}\n\n${HELP_TEXT}`, needsAgentAction: null };
  }
  return { reply: await handler(), needsAgentAction: null };
}

/**
 * Polls Telegram for new messages since the last seen update_id, replies to
 * each, and persists the new offset. Also drains any `pending_commands`
 * queued by the (optional) webhook accelerator. Returns the list of
 * needsAgentAction flags for the orchestrator/agent to act on.
 */
export async function processPendingTelegramInput() {
  const state = readJSON(STATE_PATH);
  const agentActions = [];

  // 1. Commands queued by the webhook accelerator (if deployed).
  if (state.pending_commands.length > 0) {
    for (const cmd of state.pending_commands) {
      if (cmd === 'publish') agentActions.push('publish_now');
    }
    state.pending_commands = [];
  }

  // 2. Poll-based commands (always active — the safety net regardless of
  //    whether the Worker accelerator is deployed).
  const updates = await getUpdates(state.last_update_id + 1 || undefined);
  for (const update of updates) {
    // Always advance the offset, even for non-text updates (stickers, chat
    // member changes, etc.) — otherwise an unhandled update type would be
    // re-fetched on every single run forever instead of being consumed once.
    state.last_update_id = update.update_id;
    const text = update.message?.text;
    if (!text) continue;
    const { reply, needsAgentAction } = await routeCommand(text);
    await sendMessage(reply);
    if (needsAgentAction) agentActions.push(needsAgentAction);
  }

  writeJSON(STATE_PATH, state);
  return { agentActions, processedCount: updates.length };
}
