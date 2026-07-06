# Decision: The Real Reader — AI SDK and Claude

## What this covers

How a **model-based** label reader — one that looks at a photo and asks an AI model to read it — talks to that model. The reader slot and the stand-in are already in place (Phase 4); this is about filling the slot with a model reader.

> **Status: this is the alternative reader now, not the default.** After measuring against the hard ~5s validation budget, the default reader became fast Google Cloud Vision OCR with in-code extraction — a model call can't guarantee the ceiling. The model reader described here stays behind the same swappable slot as a config choice (`reader.provider: anthropic`), and the same AI SDK + Claude setup also powers the deterministic-first **fallback** that backstops the rare fields OCR can't handle. See [Reader provider and the latency budget](decisions/reader-provider-and-latency.md) for why, and when each is used.

## The library: Vercel's AI SDK

We use Vercel's AI SDK — a library for talking to AI models — for two reasons that fit our design:

- **It is provider-agnostic.** The same code can talk to Claude, or another provider, chosen by config. That is the swap-point idea again, one level in: not only can the whole reader be swapped (stand-in vs real), but within the real reader the provider is a config choice. If Claude is ever too slow or another provider is clearly better, changing it is small.
- **It can enforce the response shape.** We can require the model to answer in a fixed shape — our label-report shape (found / absent / unreadable, the text read, where, confirmed / guess) — rather than free-form text we would have to pick apart. A response that does not fit the shape fails plainly instead of being quietly wrong. For a compliance tool, that predictability matters.

## The provider: Claude

Claude is the provider we use, for a plain reason and a good-fit reason: there is already an API key for it, and it suits the task — good at looking at images, good at following the "only describe, don't judge" instruction, and good at returning the fixed shape. No other provider has an advantage here that would outweigh the existing key and preference, and the SDK keeps the door open if that changes.

For the reading itself we use a fast, low-cost tier (Claude Haiku), stepping up to the mid tier (Sonnet) only if the fast one struggles on hard labels — the five-second budget favors the faster tiers, and reading a label is a fairly constrained task.

Honest caveat: "swap providers freely" is mostly true, not perfectly seamless — the fixed-shape response and the image handling can differ a little between providers, so a switch might need small adjustments, not zero.

## The reader still only describes

Using a general model does not change the line we drew: the model is told to report what it sees and whether the known values are present — never to decide pass or fail. All judging stays in our own code. See [AI extracts, the algorithm judges](decisions/ai-extracts-algorithm-judges.md).

## Cloud now, local-inside-their-network later

The reader calls a cloud AI service. The agency's own network blocks much outbound traffic, so a deployment inside it would likely need a reader that runs locally instead. That is exactly what the reader slot is for: a locally-run reader would fill the same slot with nothing else changing. For this prototype we use the cloud reader and document the local path rather than building it. (The default OCR reader, Google Cloud Vision, is likewise a cloud service — the same swap-point covers replacing it with a local OCR engine.)

## The key, and one environment gotcha

The Anthropic key is fetched from GCP Secret Manager (never an env var); see [Database and Local Development Environment](decisions/database-and-local-environment.md). The model reader and the fallback pin the AI SDK's base URL, because the SDK otherwise reads `ANTHROPIC_BASE_URL` from the environment — a stray value there (present in some dev shells) silently drops the `/v1` and 404s the call.

## Related pages
- [Reader provider and the latency budget](decisions/reader-provider-and-latency.md)
- [Label reading report](interfaces/label-reading-report.md)
- [Anchored extraction](decisions/anchored-extraction.md)
- [AI extracts, the algorithm judges](decisions/ai-extracts-algorithm-judges.md)
- [Tech stack](conventions/tech-stack.md)
