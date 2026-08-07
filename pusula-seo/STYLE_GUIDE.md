# Pusula Content Style Guide

This is the editorial constitution for every article the pipeline produces. Read it in full before writing. It exists because the brief for this project was explicit: **quality over quantity, topical authority over keyword stuffing, religious accuracy over speed.** Every rule below traces back to one of those three.

## Who this is for

A Turkish-speaking Muslim who typed a specific, often vulnerable, search query — "sabır duası," "kaygı için dua," "Hz. Eyyub'un sabrı" — into Google. They want something real: a verse, a prayer, an explanation, a moment of guidance. They are not there to be sold to. If they never open the Pusula app, the article must still have been worth their time.

## The one hard rule: verified content only

- **Quran verses**: You may only cite a verse by reference (`sure:ayet`, e.g. `2:153`). You never type Quran verse text into an article yourself — the renderer pulls the actual Arabic and Diyanet Turkish translation from `data/verses-cache.json`, populated only by `scripts/fetch-verse.mjs`. If the verse you want to cite isn't cached yet, run `fetch-verse.mjs <sure:ayet>` first. If a verse doesn't exist at the reference you think it does, the validator will catch it — don't guess.
- **Hadith**: Do not quote hadith text or attribute specific wording to the Prophet (ﷺ) or companions in this version of the system. No verified hadith dataset is wired in yet (topics tagged `requires_hadith: true` are intentionally blocked). If a topic seems to call for a hadith, either write around it using verified verses and general, unattributed conceptual explanation, or don't take that topic — never fabricate or paraphrase-as-quote.
- **Esmaül Hüsna**: names, Arabic spelling, and core meaning come from `data/esmaul-husna.json` — don't improvise the meaning gloss, but you can and should expand on it with reflection and application.
- **When in doubt, leave it out.** An article missing a nice-to-have detail is fine. An article with an unverifiable claim is not.

## Voice

- Warm, direct, and calm — like a knowledgeable friend, not a sermon and not a listicle.
- Write in Turkish for Turkish content (all seed content is Turkish; the site is bilingual at the landing-page level only, blog content is Turkish-first).
- No filler openers ("Günümüzde birçok insan..."), no throat-clearing, no restating the title as the first sentence.
- Short paragraphs. Concrete over abstract. If you can cut a sentence without losing meaning, cut it.
- Never use spammy, hard-sell language, anywhere, including the CTA.

## Required structure (enforced by `validate-article.mjs`)

1. **H1** — matches the primary keyword naturally, not stuffed.
2. **Direct-answer opening** — the first 2-3 sentences answer the query itself, standalone, before any scene-setting. (This also matters for AI-search extractability, per the ai-seo skill: lead with the answer.)
3. **Body** — logical H2/H3 sections. At minimum: the substantive answer (the dua text / verse list / kıssa / esma explanation), context or "why this matters," and **at least one practical takeaway** the reader can actually do today.
4. **Quran citations**, where relevant, via `verse-ref` blocks (rendered from the verified cache, Arabic + Turkish + reference).
5. **FAQ** — 3-5 real questions in natural language, the kind someone would actually ask, each with a direct 1-3 sentence answer. This doubles as `FAQPage` schema.
6. **Related content** — handled automatically by `build-interlinks.mjs`; you only need to suggest 2-4 genuinely relevant `related_slugs` in the content JSON.
7. **CTA** — one paragraph, soft, at the very end only. Use the tone from the example in the brief: *"Duygularına uygun bir ayet, kişisel bir dua ve yapay zeka destekli manevi rehberlik istersen, Pusula'yı deneyebilirsin."* Always paired with the App Store link (UTM-tagged automatically by the renderer — you don't need to build the link yourself).

## Minimums the validator checks

- ≥600 words of body content (excluding FAQ) for `dua`/`ayet`/`kissa`/`blog` types; `esmaul-husna` pages may run shorter since the format is more compact, but still need a real reflection section, not just the definition.
- Meta description 120-160 characters, written as genuine ad copy for the article, not a truncated first sentence.
- No banned filler phrases (checked by regex): "günümüzde," "hayatımızın her alanında," "bu yazımızda," and similar throat-clearing openers are rejected.
- No hadith-attribution phrasing unless the topic is explicitly hadith-whitelisted (none are, currently).

## Content-type notes

- **dua** (`/pusula/dua/{slug}/`): the prayer itself (Arabic if applicable + Turkish transliteration/translation — only if sourced the same verified way as verses; if you don't have a verified Arabic dua text, present the Turkish-language prayer/supplication itself, which doesn't carry the same fabrication risk as claiming specific Arabic wording is authentic), when/how it's traditionally used, and the meaning behind it.
- **ayet** (`/pusula/ayet/{slug}/`): a curated set of genuinely relevant verses (via `verse-ref`), each with a sentence of context — not just a list, an explanation of why each one speaks to the topic.
- **sure** (`/pusula/sure/{slug}/`): what the surah is about, its context, and its most relevant verses for the topic at hand.
- **esmaul-husna** (`/pusula/esmaul-husna/{slug}/`): the name, its meaning, 1-2 verses where relevant themes appear, and a grounded reflection on what living in light of that name looks like — not mysticism, not vague.
- **kissa** (`/pusula/kissalar/{slug}/`): the story as found in the Quran's own narration (cite the relevant verses), told clearly, with the lesson made explicit and connected to the reader's life.
- **blog** (`/pusula/blog/{slug}/`): conceptual/explainer content ("tevekkül nedir," "sabır nedir") — definition-first, verse-grounded, practical.

## The CTA, exactly

Every article ends with one paragraph in this spirit (adapt naturally to the topic, don't copy verbatim every time):

> Duygularına uygun bir Kur'an ayeti, kişiselleştirilmiş bir dua ve yapay zeka destekli manevi rehberlik için Pusula'yı ücretsiz deneyebilirsin.

Followed by the App Store badge/link, which the renderer auto-tags with UTM parameters (`utm_source=website&utm_medium=organic&utm_campaign={cluster}&utm_content={slug}`).
