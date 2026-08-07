#!/usr/bin/env node
/** One-off connectivity test: confirms the bot token/chat ID actually work. */
import { sendMessage } from './client.mjs';
import { formatReport } from './format.mjs';

const text = formatReport({
  headline: 'Pusula SEO motoru bağlantı testi ✅',
  bullets: [
    'Telegram entegrasyonu çalışıyor.',
    'Bu mesaj pusula-seo/scripts/telegram/send-test.mjs tarafından gönderildi.'
  ],
  why: 'İlk kurulum sırasında bot token ve chat ID doğrulanıyor.',
  topActions: [
    { label: 'Hiçbir şey yapmana gerek yok — bu sadece bir bağlantı testiydi.', impact_score: 1 }
  ]
});

const result = await sendMessage(text);
console.log(`✓ Sent. message_id=${result.message_id} chat_id=${result.chat.id}`);
