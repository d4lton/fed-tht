# Spec: Phase 5 — The Real Reader

> **How this landed:** the reader was built differently than this spec first described. Because the whole validation has a hard ~5s budget that a model call can't *guarantee*, the **default** reader became fast Google Cloud Vision OCR with field extraction in plain code; the model reader described below (Claude via the AI SDK) stays behind the same slot as a config option and as a deterministic-first fallback. This spec is kept as the record of what the phase set out to build; for what was actually built and why, see [Reader provider and the latency budget](decisions/reader-provider-and-latency.md).

## Goal

Replace the stand-in reader with a real one that looks at an actual label image and produces the label-report, by asking Claude (through Vercel's AI SDK) to read the label. It fills the same slot the stand-in filled, so combine and judge — and everything else — stay exactly as they are.

## What to build

1. A real reader that fills the reader slot: given one image and the things to look for, it asks the model to read the label and report which of the things to look for are present and where, plus the other fields, and returns that as a label-report (see [Label reading report](interfaces/label-reading-report.md)).
2. The model must answer in the label-report shape — found / absent / unreadable, the text read, where, and confirmed / guess — enforced through the AI SDK's fixed-shape response, not free-form text. A response that does not fit the shape is a clear failure, not a silent wrong answer.
3. The provider is Claude on a fast tier (Haiku), chosen through config so it can be swapped. The model's API key comes from config — the Claude key from local config in development, from GCP in production (reusing the config system from Phase 1). See [The real reader — AI SDK and Claude](decisions/real-reader-ai-sdk-and-claude.md).
4. The prompt tells the model to only report what it sees and whether the known values are present — never to decide pass or fail. Judging stays in our code.
5. Read the images in parallel, to keep within the five-second budget even with a front and back to read.
6. Handle a model timeout or error by failing the read cleanly — a clear error, not a hang or a made-up answer.

## Tests

- Against a small set of real (or generated) label image files kept in the project: a clean bourbon reads to a report that, run through combine and judge, passes; a broken one (missing warning, wrong brand) reads to a report that fails with the right reasons.
- These are the costlier "reading tests" from the [testing strategy](conventions/testing-strategy.md) — kept small on purpose. The bulk of the coverage stays the cheap hand-written-report tests from Phases 2 and 4, which do not call the model at all.
- Confirm the shape guard works: if the model returns something that does not fit the label-report shape, the reader fails plainly.

## Left to decide during the build

- The exact prompt wording.
- Whether the fast tier (Haiku) is enough, or hard labels need the mid tier (Sonnet).
- How images are sized or compressed before sending, to keep cost and time down.
- Exactly how a model error or timeout surfaces.

## Not in this phase

Storage and uploaded images (images come from files in the project for now), the endpoint, and the frontend. Building a locally-run reader for the blocked-network case is also out of scope — it is documented as the production swap, filling the same slot (see the reader decision page).

## Related pages
- [Reader provider and the latency budget](decisions/reader-provider-and-latency.md) — what the reader actually became.
- [The real reader — AI SDK and Claude](decisions/real-reader-ai-sdk-and-claude.md)
- [Label reading report](interfaces/label-reading-report.md)
- [Anchored extraction](decisions/anchored-extraction.md)
- [AI extracts, the algorithm judges](decisions/ai-extracts-algorithm-judges.md)
- [Verification pipeline](architecture/verification-pipeline.md)
- [Testing strategy](conventions/testing-strategy.md)
