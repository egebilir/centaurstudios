/**
 * Deliberately minimal templating: {{key}} is HTML-escaped, {{{key}}} is raw.
 * No conditionals/loops — callers build the full data map in JS (with '' for
 * absent optional fields) before rendering, which keeps templates auditable
 * as plain HTML.
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderTemplate(tmpl, data) {
  return tmpl
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => (key in data ? String(data[key]) : ''))
    .replace(/\{\{(\w+)\}\}/g, (_, key) => (key in data ? escapeHtml(String(data[key])) : ''));
}

/** Minimal inline markdown: **bold** and *italic* only, on already-escaped text. */
export function inlineMarkdown(escapedText) {
  return escapedText
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
}
