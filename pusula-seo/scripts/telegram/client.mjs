/**
 * Thin, reusable Telegram Bot API wrapper. Every proactive report and every
 * command reply goes through sendMessage(); the hourly orchestrator polls
 * getUpdates() for inbound commands (see commands.mjs).
 *
 * Credentials come from process.env only (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
 * — never hardcoded, never committed. Locally, lib/env.mjs loads them from
 * the gitignored .env; in the cloud Routine they're set as real env vars.
 */
import { loadEnv } from '../lib/env.mjs';

loadEnv();

const API_BASE = 'https://api.telegram.org';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set. Locally: add it to pusula-seo/.env. In the Routine: set it in the environment config.`);
  }
  return v;
}

export async function sendMessage(text, opts = {}) {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const chatId = opts.chatId || requireEnv('TELEGRAM_CHAT_ID');

  const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: opts.parseMode ?? 'Markdown',
      disable_web_page_preview: true,
      disable_notification: opts.silent ?? false
    }),
    signal: AbortSignal.timeout(15000)
  });

  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Telegram sendMessage failed: ${json.description || JSON.stringify(json)}`);
  }
  return json.result;
}

/**
 * Long-poll-free fetch of updates since `offset` (exclusive of already-seen
 * ones, per Telegram's own offset semantics). timeout=0 means this returns
 * immediately with whatever's pending — appropriate for a periodic poll
 * rather than a persistent long-poll connection.
 */
export async function getUpdates(offset) {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const url = new URL(`${API_BASE}/bot${token}/getUpdates`);
  if (offset != null) url.searchParams.set('offset', String(offset));
  url.searchParams.set('timeout', '0');

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Telegram getUpdates failed: ${json.description || JSON.stringify(json)}`);
  }
  return json.result;
}
