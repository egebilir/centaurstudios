/**
 * Optional real-time accelerator for the Pusula Telegram assistant.
 *
 * This is a single-file Cloudflare Worker — no build step, no framework, no
 * npm dependencies. It exists purely to make the *fast* commands (read-only
 * lookups, /pause, /resume) feel instant instead of waiting for the next
 * hourly orchestrator run. It is NOT required: if this Worker is never
 * deployed, Telegram never gets a webhook registered, and
 * scripts/telegram/commands.mjs's hourly `getUpdates` poll handles
 * everything exactly the same way, just with up-to-an-hour latency instead
 * of instant. See STYLE_GUIDE.md / the project plan for the full rationale.
 *
 * Deploy (Phase 2, optional):
 *   1. `wrangler secret put TELEGRAM_BOT_TOKEN`
 *   2. `wrangler secret put TELEGRAM_WEBHOOK_SECRET`   (any random string you choose)
 *   3. `wrangler secret put GITHUB_CONTENTS_TOKEN`     (fine-grained PAT, Contents: read/write, this repo only)
 *   4. `wrangler deploy`
 *   5. Register the webhook once:
 *      curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
 *
 * Command logic here intentionally mirrors scripts/telegram/commands.mjs at
 * a smaller scale (read-only + pause/resume + queueing everything else) —
 * it is a faster front door, not a second source of truth. The Node scripts
 * remain the only place actual content generation happens.
 */

const GITHUB_OWNER = 'egebilir';
const GITHUB_REPO = 'centaurstudios';
const GITHUB_API = 'https://api.github.com';
const DATA_PATH_PREFIX = 'pusula-seo/data';

const READ_ONLY_PATHS = {
  '/status': ['topics.json', 'refresh-queue.json', 'telegram-state.json'],
  '/health': ['topics.json', 'refresh-queue.json', 'telegram-state.json'],
  '/ideas': ['topics.json']
};

async function githubGetFile(env, path) {
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_CONTENTS_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'pusula-seo-telegram-worker'
    }
  });
  if (!res.ok) throw new Error(`GitHub GET ${path} failed: HTTP ${res.status}`);
  const json = await res.json();
  const content = JSON.parse(atob(json.content.replace(/\n/g, '')));
  return { content, sha: json.sha };
}

async function githubPutFile(env, path, newContent, sha, message) {
  const body = JSON.stringify({
    message,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(newContent, null, 2) + '\n'))),
    sha
  });
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_CONTENTS_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'pusula-seo-telegram-worker',
      'Content-Type': 'application/json'
    },
    body
  });
  if (!res.ok) throw new Error(`GitHub PUT ${path} failed: HTTP ${res.status} ${await res.text()}`);
}

function escapeMd(text) {
  return String(text ?? '').replace(/([_*`[])/g, '\\$1');
}

async function sendTelegram(env, text) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true })
  });
}

async function handleStatus(env) {
  const { content: topics } = await githubGetFile(env, `${DATA_PATH_PREFIX}/topics.json`);
  const { content: refreshQueue } = await githubGetFile(env, `${DATA_PATH_PREFIX}/refresh-queue.json`);
  const { content: state } = await githubGetFile(env, `${DATA_PATH_PREFIX}/telegram-state.json`);

  const counts = topics.topics.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});

  return [
    `*${state.paused ? '⏸ Otomasyon Duraklatıldı' : '▶ Otomasyon Aktif'}* _(hızlandırıcıdan)_`,
    '',
    `• Havuz: ${counts.pool || 0} bekliyor, ${counts.queued || 0} sırada, ${counts.published || 0} yayında`,
    `• Refresh kuyruğunda: ${refreshQueue.candidates.length} aday`,
    `• Son yayın: ${escapeMd(state.last_run.new_article || 'henüz yok')}`
  ].join('\n');
}

async function handleIdeas(env) {
  const { content: topics } = await githubGetFile(env, `${DATA_PATH_PREFIX}/topics.json`);
  const ideas = topics.topics
    .filter((t) => t.status === 'pool')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
    .map((t) => `• ${escapeMd(t.primary_keyword)} (${escapeMd(t.cluster)}, öncelik ${t.priority})`);
  return ['*Sıradaki Konu Önerileri* _(hızlandırıcıdan)_', '', ...(ideas.length ? ideas : ['Havuzda bekleyen konu yok.'])].join('\n');
}

async function handlePauseResume(env, pause) {
  const { content: state, sha } = await githubGetFile(env, `${DATA_PATH_PREFIX}/telegram-state.json`);
  state.paused = pause;
  await githubPutFile(env, `${DATA_PATH_PREFIX}/telegram-state.json`, state, sha, `telegram: ${pause ? 'pause' : 'resume'} automation`);
  return pause
    ? '⏸ Otomasyon duraklatıldı. Planlı yayın ve refresh işleri durdu; komutlara yanıt vermeye devam ediyorum. /resume ile tekrar başlat.'
    : '▶ Otomasyon devam ediyor.';
}

async function handleQueueCommand(env, command) {
  const { content: state, sha } = await githubGetFile(env, `${DATA_PATH_PREFIX}/telegram-state.json`);
  const cmd = command.replace('/', '');
  if (!state.pending_commands.includes(cmd)) state.pending_commands.push(cmd);
  await githubPutFile(env, `${DATA_PATH_PREFIX}/telegram-state.json`, state, sha, `telegram: queue ${cmd}`);
  return '⏳ Kaydedildi — bir sonraki çalıştırmada (en geç 1 saat içinde) işleme alınacak ve burada onaylayacağım.';
}

async function routeCommand(env, text) {
  const command = (text || '').trim().split(/\s+/)[0].toLowerCase();

  if (command === '/status' || command === '/health') return handleStatus(env);
  if (command === '/ideas') return handleIdeas(env);
  if (command === '/pause') return handlePauseResume(env, true);
  if (command === '/resume') return handlePauseResume(env, false);
  if (['/publish', '/today', '/stats', '/top', '/seo'].includes(command)) {
    return handleQueueCommand(env, command);
  }
  return null; // unrecognized — let the hourly poll's fuller help text handle it
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('ok', { status: 200 });

    const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('forbidden', { status: 403 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response('bad request', { status: 400 });
    }

    const text = update.message?.text;
    if (!text) return new Response('ok', { status: 200 });

    try {
      const reply = await routeCommand(env, text);
      if (reply) await sendTelegram(env, reply);
    } catch (err) {
      // Never let a Worker error surface to Telegram/the user as a crash —
      // the hourly poll is the safety net for anything this couldn't handle.
      console.error('worker error', err);
    }

    return new Response('ok', { status: 200 });
  }
};
