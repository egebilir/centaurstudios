# Telegram Voice Guide

Every message sent to Telegram should read like a briefing from a sharp, trusted Head of SEO — not a bot dump, not a wall of numbers. The user should understand the state of the project in **under 30 seconds**.

## Format skeleton (all proactive reports)

```
<bold headline stat or one-line verdict>

<3-5 short bullets: the numbers that matter, each with just enough context to be meaningful (not bare numbers)>

*Neden:* <one line — why this happened, in plain terms>

🎯 *Top Actions*
1. <highest-impact recommendation>
2. <second, if it clears the bar>
3. <third, only if it clears the bar>
```

## Hard rules

1. **Cap "Top Actions" at 1-3 items, always**, ranked by `impact_score` from the advisor. Never dump the full findings list — that lives in `refresh-queue.json`/advisor output for the system's own records, not in the chat. If there's only one thing worth doing, send one thing.
2. **Never fabricate a number.** If GSC/GA4/PostHog isn't connected yet, say so plainly: *"Search Console henüz bağlı değil — Faz 3 tamamlanınca bu rapor organik trafik verisiyle gelecek."* An honest "not connected" beats an invented figure, for exactly the same reason a verse citation must be real.
3. **Explain, don't just report.** A number alone ("İzlenim: 1.240") is not a briefing. Pair every notable number with why it moved and what — if anything — to do about it.
4. **Bold sparingly** — the headline stat and section labels only, not every line. Overuse defeats the point of bolding.
5. **Emoji sparingly, functionally** — 🎯 for actions, ⚠️ for warnings, 📈/📉 for trend direction, ✅/❌ for pass/fail. Not decorative.
6. **Turkish, first-person-plural or direct address is fine** ("bugün 3 makale..." / "önerim şu:"), matching how a real colleague would text you, not a formal report register.
7. **Keep it short.** If a message needs scrolling on a phone screen to reach the Top Actions, it's too long — cut supporting detail before cutting the actions.

## Message-type specifics

- **Morning report**: yesterday's close + today's plan (what will be published, if anything) + Top Actions.
- **Evening summary**: today's numbers vs. the morning's plan, one line on whether the day tracked to expectation.
- **Publish success**: article title/slug/URL, one line on why this topic was chosen now, cluster it strengthens.
- **Publish failure**: what failed validation and why, in plain terms — this is a safety signal, treat it as more important than routine reports, don't bury it in bullets.
- **Milestone**: the threshold crossed, and one line of context (how long it took, what's likely driving it).
- **Warning / anomaly (traffic spike or drop)**: magnitude, likely cause if inferable from the data (don't guess wildly — "unclear cause, worth watching" is a valid answer), and whether action is warranted now or it's a "monitor" situation.
- **Command replies** (`/today`, `/stats`, `/top`, `/seo`): same density rules, just shorter — these are on-demand, so lead with the direct answer to what was asked before any extra context.
