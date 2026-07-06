# Decision: Reader Provider and the Latency Budget

## The requirement that forces this

The whole validation of an application — loading it, reading **all** its label images, combining, and judging — must complete within **5000ms**. This is a hard product requirement: a single validation that runs over is a project failure, not a rare event to tolerate. So the design has to bound the **worst case**, not just improve the average.

## Why the model reader can't meet it

The real reader can be the model reader (Claude via the AI SDK) or a fast OCR reader; the [reader slot](interfaces/label-reading-report.md) makes it a config choice. Measured on generated fixture labels this session, the model reader (Claude Haiku, structured output):

- single read p50 **3328ms**, p90 **4217ms**, p95 **4569ms** — a fat tail;
- a full two-label application (reads run in parallel) p90 **~4169ms**, leaving almost no room for image loads + judge;
- cold start **~7063ms** — one cold read alone blows the budget by 40%.

The deeper problem is not the average — it is that an external model call carries **no per-request latency ceiling**. Trimming the output schema and downscaling the image lower the average, and warm instances plus hedged requests thin the tail, but none of it makes "every validation under 5000ms" a *guarantee*. For a hard ceiling, "rare breach" is still a breach.

## The decision

**The default reader is Google Cloud Vision OCR, with field extraction done in plain code.** Measured on the same fixtures:

- single OCR read p50 **235ms**, p90 **299ms**, max **299ms** — a tight, predictable distribution;
- a full two-label application **~240ms** warm; **~1089ms** including the client's cold start;
- the whole read → combine → judge pipeline returns a correct pass/fail in **~0.7–1.1s**, ~4s inside the budget.

Vision's tail is far tighter than a model's, so the budget holds with large margin even on a bad day. That predictability — not just the ~15× speedup — is why it wins for a hard latency requirement.

## The model reader stays, by config

`reader.provider` selects the reader: `google-vision` (default) or `anthropic`. The Claude reader is kept behind the same slot for cases where reading quality matters more than latency (ornate or damaged labels, or an offline review pass). This is the "provider is a config choice" idea from [The Real Reader — AI SDK and Claude](decisions/real-reader-ai-sdk-and-claude.md), now with a second provider actually in place; that page still describes the model reader.

## Extraction moves into code

An OCR reader returns flat text, so turning text into the label-report shape — one observation per field, `found`/`absent`, the text, and `confirmed`/`guess` — is done in plain, deterministic code, not by a model. This fits the project's spine: the reader still only **describes**; every pass/fail decision stays in the judge ([AI extracts, the algorithm judges](decisions/ai-extracts-algorithm-judges.md)). Fields are found by **anchoring to known values** ([Anchored extraction](decisions/anchored-extraction.md)) — the expected brand and name/address, the fixed warning wording, and the legal designations are searched for across the whole text, never by position.

**Principled parsers, not ad-hoc regex.** Real labels quickly showed how brittle hand-picked patterns are, so the extraction is built from proper, tested field parsers rather than one-off regex:
- **net contents** — a full unit lexicon (ml, liter, centiliter, fluid ounce, pint, quart, gallon, with spellings and plurals), so "1 PINT" reads the same as "750 mL";
- **brand and name/address** — matched as a word **subsequence** (the expected words in order, gaps allowed), since a label splits a producer's name from its city and state with other text between;
- **alcohol** — a percentage plus an alcohol word in any order (or a proof/ABV figure), so "ALC. 13.5% BY VOL" and "13.5% Alcohol by Volume" both read;
- **government warning** — the judge anchors the known wording *within* what the reader hands it, so trailing net-contents / sulfite / barcode text below the warning can't read as a changed word. This replaced an earlier, brittle "take N words" trick.

**Unreadable vs. wrong.** A warning that doesn't match exactly is split two ways by character-level similarity (spacing and punctuation removed first, where OCR fails most): a read *very close* to the required wording — words run together, a letter dropped, the signature of a sideways or low-quality print — is `unreadable` ("couldn't read it," a human/re-read question), while a substantially different read is `wrong-words` (a genuinely non-compliant warning). This keeps a poor *read* from masquerading as a bad *label*, and a single-character difference — ambiguous between an OCR slip and a real typo — lands in `unreadable` rather than being asserted wrong.

Residual limits of doing this without a model, to revisit if real labels demand it:
- a brand present but *different* from the expected one reads as **absent** (→ "missing") rather than "wrong";
- a fanciful class/type designation matching no legal core term reads as **absent** rather than a `guess`;
- a genuinely novel surface form (e.g. a *spelled-out* quantity, "ONE PINT NINE OUNCES", which has no digit to anchor) is missed.
The last two are what the fallback below exists to catch. The accuracy is proven on the generated fixtures plus a handful of realistic hand-made labels; ornate real labels should still be spot-checked before this is called production-proven.

## Deterministic-first, with a model fallback

The fast deterministic path handles the common case within budget; a model catches the rare thing it can't — **deterministic-first, model-on-a-miss**. After the fast pass judges, *only if* it would fail, the model is consulted for the specific hard fields, in one of two moves depending on why the field failed:

- **recheck** — a required field the OCR text *has* but the parser *missed* (a spelled-out quantity, a split producer line). A **text-only** call re-examines the already-read OCR text — cheap, ~2.8s warm.
- **reread** — a required field the OCR read *too poorly to judge* (the `unreadable` warning above). A **vision** call re-reads the image, which handles rotation and poor print far better than flat OCR.

The two moves run **in parallel** (independent, so total time is the slower one, not the sum) and each is handed the time left in the 5000ms; whatever they confirm **replaces** the fast pass's read of that field and the set is re-judged.

Properties that keep this safe and bounded:
- it runs **rarely** — only on a would-be failure, never on a pass;
- it can only clear a field's failure, never introduce one, so it **can't turn a pass into a fail** (a re-read that comes back *also* unreadable — the model agreeing the print is too poor — simply leaves the honest `unreadable` verdict standing, as happened on a real sideways-warning label);
- it is **budget-bounded**: abandoned past the remaining deadline, with the deterministic result left standing, so it can't blow the ceiling;
- it is **dormant** unless a model key is configured (`anthropicKeySecret`); with no key both moves are no-ops. The base URL is pinned so a stray `ANTHROPIC_BASE_URL` can't redirect the call.

The honest cost: a label that genuinely fails a required field always triggers the fallback and pays its latency, and on a cold model instance that can approach the budget — which is why the calls are parallel and deadline-bounded, and why warm instances matter when the fallback is enabled. The hard guarantee holds for the deterministic path; the fallback is best-effort rescue on top, not part of the guarantee.

## Credentials and cost

Vision authenticates with Application Default Credentials — no API key — exactly like the Secret Manager access (see [Database and Local Development Environment](decisions/database-and-local-environment.md), "How secrets are sourced"). Production needs the Cloud Vision API enabled on the service's project and the service account granted **Cloud Vision API User**; locally it uses `gcloud auth application-default login` (and the Docker mount). Vision billing is per image; the model reader and the fallback bill per token.

## Related pages
- [The Real Reader — AI SDK and Claude](decisions/real-reader-ai-sdk-and-claude.md)
- [AI extracts, the algorithm judges](decisions/ai-extracts-algorithm-judges.md)
- [Anchored extraction](decisions/anchored-extraction.md)
- [Database and Local Development Environment](decisions/database-and-local-environment.md)
- [Label reading report](interfaces/label-reading-report.md)
