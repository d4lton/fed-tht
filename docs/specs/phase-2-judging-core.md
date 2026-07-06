# Spec: Phase 2 — The Judging Core (combine and judge)

## Goal

Build the heart of the system: the plain logic that takes a set of label reads plus the expected values and produces a result — a pass, or a fail with reasons. No images, no AI, no storage, no web layer. Everything here is ordinary code tested with hand-written inputs. This is the piece the whole design is built around, so it must be fully covered by tests before anything downstream leans on it.

## What it does

Two steps, both plain and self-contained:

1. **Combine** — take the per-image reads and merge them into one view across all the labels. Carry each field's state (found / absent / unreadable); a field found on any label counts as present; and spot when two labels disagree on the same field.
2. **Judge** — take that combined view, the drink type, and the expected values (brand; name and address; imported-or-domestic), apply the checks for that type, and return the result.

The input read shape is [Label reading report](interfaces/label-reading-report.md); the output shape is [Validation result](interfaces/validation-result.md). Both are already specified — this phase turns them into code.

## The checks (spirits, this phase)

Each check, with the reason(s) it can produce on a fail. (Reason IDs are a starting point — they will firm up as the code lands.)

- **Warning** — present and correct: the exact wording, with "GOVERNMENT WARNING" in capital letters. Reasons: `warning-missing`, `warning-wrong`, `warning-caps`.
- **Brand** — matches the expected brand, lenient on capitalization and punctuation. Reasons: `brand-missing`, `brand-wrong`.
- **Name and address** — matches the producer on file, loosely (allow wrapping like "Bottled by …, City, ST"). Reasons: `name-address-missing`, `name-address-wrong`.
- **Alcohol content** — a properly formed statement is present. Reason: `alcohol-missing`.
- **Net contents** — a properly formed statement is present. Reason: `net-contents-missing`.
- **Class/type** — matches a legal designation from the compiled list; a specialty free-form name can't be confirmed and so fails. Reasons: `class-type-missing`, `class-type-invalid` (a non-designation phrase), `class-type-unconfirmed` (a specialty name). See [Checking the class/type designation](decisions/class-type-designation.md).
- **Country of origin** — required only if imported. Imported and missing → fail; domestic → nothing at all. Reason: `country-of-origin-missing`.
- **Labels agreeing** — the same field showing different values on two labels → fail. Reason: `<field>-conflict` (e.g. `brand-conflict`).
- **Completeness** — a mandatory field absent from every label produces that field's "missing" reason (so this is covered by the per-field missing reasons above, not a separate mechanism).

## The rules as data, not code

Per [Configuration as declarative data](decisions/configuration-as-declarative-data.md), the checks read from a per-type rules file rather than hard-coding rules in branches. For this phase:

- A **spirits rules file** (YAML) describing each field: what it is, when it is required, and how it is found (from the expected value / a fixed text / the designation list / by its format).
- The **fixed warning wording** kept in one place the rules point at, not copied per type. Source text is on [TTB label requirements reference](concepts/ttb-label-requirements-reference.md).
- The **compiled list of legal spirit designations** (the standards-of-identity classes and types, with the core terms the check looks for).
- A **loader** that reads the YAML and checks it on load, so a malformed rules file fails loudly rather than mid-run.

Keep the core plain: the combine-and-judge logic takes the rules as ordinary in-memory data. The YAML file and its loader are a thin adapter that produces that data. The core's own tests hand it rules data directly — no file reading in the core tests.

## Tests

Per [Testing strategy](conventions/testing-strategy.md): every check gets at least one passing label and one failing label, hand-written as reads (no images). Include the cases listed there — brand mismatch; name/address mismatch and missing; alcohol missing; net contents missing; warning missing, wording changed, and not-capitalized; class/type valid, bogus, and specialty; country of origin imported-and-missing versus domestic; two labels disagreeing; and the sulfite no-false-fail case. A check without a failing test is not done.

## Done when

- Combine and judge are plain functions/methods with no image, storage, web, or framework dependencies.
- The spirits rules load from the YAML file and are checked on load.
- Every check has a passing and a failing test, all green.
- A hand-written bourbon (front + back reads) run through the core yields a pass; a mangled one yields a fail carrying the right reasons.

## Left to decide during the build

- The exact YAML shape of the rules file.
- The final reason-ID strings (the set above is the starting point).
- Concretely how lenient the brand and name/address comparisons are — which differences to ignore.
- How the class/type "known core term inside the phrase" match works in detail.

## Not in this phase (later specs)

Reading real images, the stand-in reader, storage and the application record, the endpoint, and the frontend. The core is fed hand-written reads here; wiring something to produce real reads is the next phase.

## Related design pages
- [Verification pipeline](architecture/verification-pipeline.md) — this is steps 3 (combine) and 4 (judge).
- [Validation result](interfaces/validation-result.md)
- [Label reading report](interfaces/label-reading-report.md)
- [Configuration as declarative data](decisions/configuration-as-declarative-data.md)
- [Anchored extraction](decisions/anchored-extraction.md)
- [Checking the class/type designation](decisions/class-type-designation.md)
- [Testing strategy](conventions/testing-strategy.md)
- [TTB label requirements reference](concepts/ttb-label-requirements-reference.md)
