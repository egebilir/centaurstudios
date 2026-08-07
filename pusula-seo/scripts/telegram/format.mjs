/**
 * Executive-briefing formatting, shared by every report and command reply.
 * Encodes the hard rules from TELEGRAM_VOICE.md in code so they can't be
 * quietly skipped: Top Actions is always capped at 3, "not connected" is
 * said plainly rather than papered over with a fabricated number.
 *
 * IMPORTANT: every dynamic string (slugs, filenames, keywords, anything not
 * written by us as literal template text) MUST go through escapeMd() before
 * being interpolated. Telegram's legacy Markdown parser hard-fails the
 * entire send on a stray `_`, `*`, `` ` ``, or `[` — e.g. a slug like
 * "related_slugs" or "tevekkul-nedir" breaks the whole message otherwise.
 * This was caught by an actual failed send during build, not guessed.
 */

const MD_SPECIAL = /([_*`[])/g;

/** Escapes Telegram legacy-Markdown special characters in untrusted/dynamic text. */
export function escapeMd(text) {
  return String(text ?? '').replace(MD_SPECIAL, '\\$1');
}

/**
 * @param {object} p
 * @param {string} p.headline - bold one-liner, the verdict. Escaped automatically.
 * @param {string[]} [p.bullets] - short supporting stats/facts. Escaped automatically.
 * @param {string} [p.why] - one line on why this happened. Escaped automatically.
 * @param {{label:string, impact_score?:number}[]} [p.topActions] - will be
 *        sorted by impact_score desc and hard-capped at 3. Labels escaped automatically.
 */
export function formatReport({ headline, bullets = [], why, topActions = [] }) {
  const lines = [`*${escapeMd(headline)}*`, ''];

  for (const b of bullets) lines.push(`• ${escapeMd(b)}`);

  if (why) {
    lines.push('');
    lines.push(`_Neden:_ ${escapeMd(why)}`);
  }

  const capped = [...topActions]
    .sort((a, b) => (b.impact_score ?? 0) - (a.impact_score ?? 0))
    .slice(0, 3);

  if (capped.length) {
    lines.push('');
    lines.push('🎯 *Top Actions*');
    capped.forEach((a, i) => lines.push(`${i + 1}. ${escapeMd(a.label)}`));
  }

  return lines.join('\n');
}

export function formatNotConnected(serviceName) {
  return `⚠ ${escapeMd(serviceName)} henüz bağlı değil — Faz 3 tamamlanınca bu rapor gerçek verilerle gelecek.`;
}

export function formatFailure({ what, reason, articleSlug }) {
  const lines = [
    `❌ *Yayın Başarısız: ${escapeMd(what)}*`,
    '',
    escapeMd(reason)
  ];
  if (articleSlug) lines.push('', `Konu: \`${escapeMd(articleSlug)}\``);
  lines.push('', 'Bu bir güvenlik sinyalidir — yanlış ya da doğrulanamamış bir içerik yayınlanmadı.');
  return lines.join('\n');
}

export function formatPublishSuccess({ title, url, cluster, whyNow }) {
  const lines = [
    `✅ *Yeni içerik yayında*`,
    '',
    `*${escapeMd(title)}*`,
    escapeMd(url)
  ];
  if (whyNow) lines.push('', `_Neden şimdi:_ ${escapeMd(whyNow)}`);
  if (cluster) lines.push('', `Küme: ${escapeMd(cluster)}`);
  return lines.join('\n');
}

export function formatMilestone({ metric, value, context }) {
  const lines = [`🎉 *Kilometre Taşı: ${escapeMd(metric)} — ${escapeMd(String(value))}*`];
  if (context) lines.push('', escapeMd(context));
  return lines.join('\n');
}

/* ---------- Search Console milestones ----------
 * These are individual, atomic event notifications (not aggregate reports),
 * so they don't go through formatReport()'s Top-Actions structure — each
 * one is already a single, complete thing worth a message on its own.
 * Positive events are framed as genuine wins, not just data points — per
 * the brief, the assistant should celebrate, not only report problems. */

export function formatIndexedMilestone({ url, totalIndexed }) {
  return [
    '🎉 *Google yeni bir sayfayı indeksledi*',
    '',
    'URL:',
    escapeMd(url),
    '',
    'Toplam indekslenen sayfa:',
    escapeMd(String(totalIndexed))
  ].join('\n');
}

export function formatFirstImpression({ title, keyword }) {
  return [
    '📈 *İlk Google Gösterimi*',
    '',
    'Makale:',
    escapeMd(title),
    '',
    'Anahtar Kelime:',
    escapeMd(keyword)
  ].join('\n');
}

export function formatFirstClick({ title, keyword }) {
  return [
    '🚀 *İlk Organik Tıklama*',
    '',
    'Makale:',
    escapeMd(title),
    '',
    'Anahtar Kelime:',
    escapeMd(keyword)
  ].join('\n');
}

export function formatRankingImprovement({ title, keyword, from, to }) {
  return [
    '🏆 *Sıralama İyileşti*',
    '',
    'Makale:',
    escapeMd(title),
    '',
    'Anahtar Kelime:',
    escapeMd(keyword),
    '',
    'Pozisyon:',
    `${escapeMd(String(from))} → ${escapeMd(String(to))}`
  ].join('\n');
}

export function formatTop10Reached({ title, keyword, position }) {
  return [
    "🔥 *İlk 10'a Girdi*",
    '',
    'Makale:',
    escapeMd(title),
    '',
    'Anahtar Kelime:',
    escapeMd(keyword),
    '',
    'Güncel Pozisyon:',
    escapeMd(String(position))
  ].join('\n');
}

export function formatRankingDrop({ title, keyword, from, to, recommendedAction }) {
  const lines = [
    '⚠️ *Sıralama Düştü*',
    '',
    'Makale:',
    escapeMd(title),
    '',
    'Anahtar Kelime:',
    escapeMd(keyword),
    '',
    'Pozisyon:',
    `${escapeMd(String(from))} → ${escapeMd(String(to))}`
  ];
  if (recommendedAction) {
    lines.push('', 'Önerilen Aksiyon:', escapeMd(recommendedAction));
  }
  return lines.join('\n');
}

const DEFAULT_RANKING_DROP_ACTION =
  "İçeriği tazelemeyi düşünebilirsin: başlığı/meta açıklamayı güçlendirmek, güncel bir örnek ya da ek bir bölüm eklemek sıralamayı toparlayabilir.";

/** Routes a detect-milestones.mjs event to its formatter. Single entry
 * point so orchestrator.mjs doesn't need a parallel switch statement. */
export function formatGscMilestoneEvent(event) {
  switch (event.type) {
    case 'indexed':
      return formatIndexedMilestone(event);
    case 'first_impression':
      return formatFirstImpression(event);
    case 'first_click':
      return formatFirstClick(event);
    case 'ranking_improvement':
      return formatRankingImprovement(event);
    case 'top10_reached':
      return formatTop10Reached(event);
    case 'ranking_drop':
      return formatRankingDrop({ ...event, recommendedAction: DEFAULT_RANKING_DROP_ACTION });
    default:
      throw new Error(`Unknown GSC milestone event type: "${event.type}"`);
  }
}
