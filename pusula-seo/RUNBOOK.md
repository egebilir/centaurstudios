# Pusula SEO Engine — Hourly Runbook

You are running as a scheduled cloud agent against the `egebilir/centaurstudios` repo, inside `pusula-seo/`. You have zero memory of any previous run — everything you need is in this file, the repo's data files, and `STYLE_GUIDE.md`/`TELEGRAM_VOICE.md`. Read those two files now if you haven't.

This runs every hour. Most hours, there is very little to do. Follow this exactly — don't skip the orchestrator step, don't publish anything that hasn't passed `validate-article.mjs`, and don't send a report that invents a number.

## 0. Setup

```
cd pusula-seo
git pull
npm ci
```

Confirm required env vars are set (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` at minimum — `GSC_*`/`GA4_*`/`POSTHOG_*` are optional until Phase 3). If `TELEGRAM_BOT_TOKEN` is missing, stop and do nothing further — there's no way to notify about anything without it, so silently failing everything downstream would be worse than a clear early stop. If you have shell access to a CI/task log, that's your fallback signal.

**Git push authentication**: this environment's ambient GitHub connection is OAuth-based and may not carry write access (hit for real — pushes and GitHub API writes both failed with "Resource not accessible by integration"). A `GITHUB_CONTENTS_TOKEN` fine-grained PAT has been independently verified (via the GitHub API, a real `git push` to `main`, and a real Contents API write — all from outside this sandbox) to have completely valid write access, and `main` has no branch protection. Despite all of that, `git push` from *this specific sandbox* has still failed with HTTP 403 while `git ls-remote` from the same sandbox, same token, succeeded moments earlier.

**That means read-only checks here (`git ls-remote` etc.) do not reliably predict whether `git push` will work later — don't treat one as a stand-in for the other.** The likely cause is GitHub applying stricter automated screening to the git-receive-pack protocol from this network origin specifically, which a `git ls-remote` (read) simply doesn't exercise. So:

1. Check the token is non-empty before trying to use it — an unset variable silently interpolates to an empty string, producing a remote URL that looks fine but fails later with a confusing generic error:
   ```
   test -n "$GITHUB_CONTENTS_TOKEN" && echo "token is set (${#GITHUB_CONTENTS_TOKEN} chars)" || echo "GITHUB_CONTENTS_TOKEN is EMPTY or UNSET"
   ```
   If it's empty/unset, note that and proceed with the default remote — Section 3 handles what happens when push fails either way.
2. If it's set, configure the remote:
   ```
   git remote set-url origin "https://x-access-token:${GITHUB_CONTENTS_TOKEN}@github.com/egebilir/centaurstudios.git"
   ```
3. Don't verify further here — proceed to Section 3. Whether `git push` actually works can only be known by trying it for real at publish time, and Section 3 already has a Contents-API fallback (`scripts/github-publish.mjs`) for exactly the case where it doesn't. Spending a read-only check here to "fail fast" isn't actually reliable, so it's not worth the false confidence.

If `GITHUB_CONTENTS_TOKEN` is not set at all, proceed with the default remote — Section 3's push-failure handling covers what to do if it turns out not to have write access either.

## 1. Run the orchestrator

```
node scripts/orchestrator.mjs
```

This is deterministic — it processes any pending Telegram commands (replying already, before you even see this), pulls daily metrics if connected, checks and sends Search Console milestones (new pages indexed, first impression/click, ranking moves — see below), runs the weekly refresh scan if due, checks publish-count milestones, and prints a JSON `due` object. **Everything below is keyed off that JSON.** If a flag is `false`, skip that section entirely.

**Search Console milestones need no action from you** — `runGscMilestoneCheck` inside the orchestrator already detected and sent them (once a day, deduplicated via `data/gsc-milestones-state.json`) before you saw this output. They're mentioned here only so you understand what already happened and don't second-guess a Telegram message that appears alongside your other output. This runs regardless of `paused` — celebrating/flagging what Search Console already reported isn't "automation" in the sense pause is meant to stop.

## 2. `due.agentActions` contains `"publish_now"`

Someone sent `/publish` on Telegram. Go straight to **Section 3** (publish flow) right now, regardless of what `due.publishArticle` says — this is an explicit request, not the scheduled slot.

## 3. `due.publishArticle === true` (or `/publish` was requested)

This is the one step that genuinely requires your own reasoning — everything else in this runbook is mechanical.

1. `node scripts/pick-topic.mjs` — get the next topic. If it prints "No eligible topics remain," send a Telegram warning (`sendMessage` via `scripts/telegram/client.mjs`, formatted with `formatReport` — headline like "⚠ Konu havuzu tükendi") and stop this section.
2. Read `STYLE_GUIDE.md` in full if you haven't this run. It is the actual editorial constitution — word count minimums, the hadith ban, the verse-citation rule, tone. Not optional reading.
3. For every Quran verse you plan to cite, run `node scripts/fetch-verse.mjs <sure:ayet>` first (idempotent — safe even if already cached). **You may only ever cite a verse by reference. Never type verse text yourself; the renderer pulls it from the cache.**
4. Write the article as a content JSON file at `content/{content_type}/{slug}.json`, matching the schema used by the existing files in that folder (look at `content/dua/sabir-duasi.json` for a complete real example — body blocks: `heading`, `paragraph`, `list`, `verse`, `dua`, `quote_callout`, `takeaways`; plus `faq`, `cta_text`, `related_slugs`).
5. `node scripts/validate-article.mjs content/{content_type}/{slug}.json`
   - **If it fails**: do NOT retry-and-hope. Read the specific error. If it's fixable (word count, meta length), fix and re-validate. If it's a genuine accuracy problem (verse not resolvable, hadith phrasing, `requires_hadith` topic), **stop, do not publish**, and send a Telegram failure notification:
     ```js
     import { buildPublishFailureMessage } from './scripts/reports/publish-notification.mjs';
     import { sendMessage } from './scripts/telegram/client.mjs';
     await sendMessage(buildPublishFailureMessage(topic, validationResult));
     ```
     This is the "notify me if something fails" mechanism from the project brief. A failure here means nothing goes live — that's correct behavior, not a bug to route around.
6. On success:
   ```
   node scripts/render-article.mjs content/{content_type}/{slug}.json
   node scripts/generate-og-image.mjs content/{content_type}/{slug}.json
   node scripts/build-sitemap.mjs
   node scripts/build-interlinks.mjs
   ```
7. Mark the topic published:
   ```js
   import { markPublished } from './scripts/pick-topic.mjs';
   markPublished(topicId, source); // source is '_source' from the pick-topic.mjs output: 'topics.json' or 'esmaul-husna.json'
   ```
8. Update `data/telegram-state.json`: set `last_run.new_article` to the current ISO timestamp (read-modify-write the file directly — same pattern as `orchestrator.mjs`'s `runDailyMetricsPull`).
9. `git add -A && git commit -m "feat: publish {title}"` — commit locally, but **do not send any Telegram notification yet.** A local commit is not "published." This session's checkout is ephemeral — if every step below fails, this commit will not exist anywhere once the session ends, so there is nothing to "leave pending."
10. `git push` — this is the step that actually makes it live (GitHub Pages deploys on push to `main`).
    - **If it succeeds**, send the success message and you're done:
      ```js
      import { buildPublishSuccessMessage } from './scripts/reports/publish-notification.mjs';
      await sendMessage(buildPublishSuccessMessage(content, { whyNow: '<your one-line reasoning for this topic, this cluster, right now>' }));
      ```
    - **If it fails** (auth error, permission error, anything else): don't give up yet — try the fallback below before concluding anything is actually broken.
11. **Fallback if `git push` failed**: `node scripts/github-publish.mjs "feat: publish {title}"`. This publishes the same changes via the GitHub REST API instead of the git protocol — a real, confirmed failure mode is `git push` getting blocked (HTTP 403) from this environment's network origin specifically, while plain HTTPS REST calls (which this script only ever makes) work fine, including from this exact sandbox. It reports `{published, files, failed}` — if `failed` is empty and `published > 0`, treat this exactly like a successful push (send the success message, same as above). If it *also* fails, now you're in genuine "needs a human" territory:
    ```js
    import { sendMessage } from './scripts/telegram/client.mjs';
    import { formatFailure } from './scripts/telegram/format.mjs';
    await sendMessage(formatFailure({
      what: 'git push (' + topic.slug + ')',
      reason: '<the exact git error> — and the Contents API fallback (scripts/github-publish.mjs) also failed with <that error>. The article passed validation and was committed locally, but nothing could be published through either path. This session is ephemeral — if not published before it ends, this work is gone and will need to be regenerated once access is fixed. This needs a human to fix repo write access, not a retry.'
    }));
    ```
    Only send this double-failure message if *both* paths genuinely failed — don't skip straight to it just because `git push` failed, since the fallback exists precisely to catch that case.

This section replaces an earlier version of this runbook that sent the success message *before* attempting the push — which produced a real false-positive "published" notification that then needed a follow-up correction. Push (or publish) first, confirm it worked, then and only then say so.

## 4. `due.morningReport === true`

```js
import { buildMorningReport } from './scripts/reports/morning-report.mjs';
import { sendMessage } from './scripts/telegram/client.mjs';
const { text } = await buildMorningReport();
```
Read `text`. If you have genuine additional context (you just published something notable, you noticed a pattern the deterministic data can't see), you may enrich the `_Neden:_` line — but never invent a number that isn't in the underlying data. Send it, then update `data/telegram-state.json`'s `last_run.morning_report` to now.

## 5. `due.eveningSummary === true`

Same pattern with `scripts/reports/evening-summary.mjs`, then update `last_run.evening_summary`.

## 6. `due.refreshScanRanNow === true`

The scan already ran (orchestrator does this deterministically). Read `data/refresh-queue.json` — if there are candidates, mention the top one or two in your next report, or send a standalone note if severity is high (severity ≥ 3). No `last_run` update needed here — the orchestrator already set `last_run.refresh_scan`.

## 7. `due.advisorDeepDive === true`

```js
import { generateRecommendations } from './scripts/advisor/generate-recommendations.mjs';
```
This is the one place you're explicitly asked to add real narrative value: don't just relay `recommendations[].summary` verbatim for all of them. Pick the top 1-3 by `impact_score` (already sorted), explain **why** each matters and **what** to actually do, in the Head-of-SEO voice from `TELEGRAM_VOICE.md`. Send via `formatReport` with those three as `topActions`. Update `data/telegram-state.json`'s `last_run.advisor_recommendations` to now.

## 8. Any other `agentActions`

Currently only `publish_now` exists (handled in Section 3). If you see something else here, treat it as a signal the command router (`scripts/telegram/commands.mjs`) was extended and this runbook is out of date — do the obviously-correct thing and note the gap.

## Hard rules, restated

- Never type Quran verse text yourself. Reference only; the cache is the only source of truth.
- Never quote or attribute hadith. `requires_hadith: true` topics are off-limits in V1.
- Never fabricate a metric. "Not connected yet" is always the honest answer when GSC/GA4/PostHog aren't configured — `formatNotConnected()` exists for exactly this.
- Every outward-facing report caps "Top Actions" at 3, ranked by `impact_score`. This is enforced in `format.mjs`, but don't work around it by stuffing everything into `bullets` instead.
- A failed `validate-article.mjs` run means **no publish**, not a retry-until-it-passes-by-any-means. If you can't fix it honestly, report the failure and stop.
