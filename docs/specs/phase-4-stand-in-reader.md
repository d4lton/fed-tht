# Spec: Phase 4 — The Reader (stand-in first)

## Goal

Build the slot a label reader plugs into, and a stand-in reader that fills it with known, pre-set reads instead of looking at real photos. Then wire the whole flow together — read each image, combine the reads, judge — so the full path runs end to end on predictable input, before any real photo-reading exists. This is what lets the real photo-reader drop into the same slot later with nothing else changing.

## Why a stand-in first

The reader is the one part that talks to the outside world (real photos, and later a photo-reading model). Everything else is plain logic. By building the flow against a stand-in reader that returns known reads, the whole path can be wired and checked now, cheaply and predictably. The real reader is a separate, later phase; it plugs into the same slot.

## What to build

1. **The reader slot** — the shape any reader must have: given one image and the things to look for, it produces one label reading report (see [Label reading report](interfaces/label-reading-report.md)). The "things to look for" are the expected brand and the expected name and address (passed in), plus the fixed warning wording and the list of legal designations for the drink type (which already come from the rules loaded in Phase 2). This slot is shaped for the real reader; the stand-in fills it too.

2. **A stand-in reader** — fills the slot by returning pre-set reads it was handed, rather than looking at the image. It accepts the things to look for, because the slot includes them, but doesn't need to use them — it just returns the reads it was set up with. This is what tests (and possibly an early demo) feed known scenarios into.

3. **Wiring: read → combine → judge** — for a set of images plus the drink type and the expected values, read each image through the slot (once per image), combine the reads, and judge, producing a result. Combine and judge already exist from Phase 2 (see [Verification pipeline](architecture/verification-pipeline.md), steps 2–4). The expected values are passed in directly for now; loading them from a stored application is a later phase.

## Tests

The read → combine → judge flow runs end to end on the stand-in:

- A stand-in set up with a clean bourbon's reads (front + back) yields a pass.
- A stand-in set up with a mangled one — a missing warning, a wrong brand, two labels disagreeing — yields a fail with the right reasons.

These reuse the same kinds of scenarios as the core's own tests from Phase 2, now run through the whole flow rather than handed straight to the judge.

## Done when

- The reader slot is defined, and the flow reads through it rather than being handed reads directly.
- The stand-in reader returns pre-set reads and can be set up per scenario.
- Running a set of images (with hand-provided expected values) through read → combine → judge yields the right result — a pass for a clean set, a fail with the right reasons for a broken one.
- Swapping the reader is a matter of providing a different one in the slot; nothing else changes.

## Left to decide during the build

- Exactly how the stand-in is handed its pre-set reads (per test setup).
- Whether the stand-in is also usable as a run-time "demo" reader, so the deployed service can show the whole flow before the real reader exists — optional, but cheap if the slot is clean.

## Not in this phase

The real photo-reader (the reading model, and the blocked-network handling that goes with running it locally), storage and loading the application, the endpoint, and the screen. This phase feeds the flow hand-set reads and hand-provided expected values.

## Related design pages
- [Verification pipeline](architecture/verification-pipeline.md) — the read step feeding combine and judge
- [Label reading report](interfaces/label-reading-report.md) — what the reader produces
- [Anchored extraction](decisions/anchored-extraction.md) — the things to look for, and why the slot takes them
- [AI extracts, the algorithm judges](decisions/ai-extracts-algorithm-judges.md) — the reader only describes; it never judges
