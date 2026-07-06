# Validation Service Boundaries

Defines the shape of the boundaries in the [verification pipeline](architecture/verification-pipeline.md). Names and types are conceptual — the intent is the contract, not the exact syntax.

## The validation endpoint

Validation happens through a single endpoint. It takes an **application ID**, loads the stored record and its label images, runs the checks, and returns the result. The endpoint is thin: no compliance logic lives here.

There is deliberately **no** separate "validate one image" endpoint. Required information can be spread across several labels, so validation has to see the whole set at once; a lone image is just a set of size one. See [One validation endpoint](decisions/single-validation-endpoint.md).

Note on scope: the service will also carry other endpoints — sign-in, frontend support (including serving a label image's bytes by reference), and the application record's own create/read/update/delete — but those are outside the scope of these design pages. Wherever this page says "one endpoint," it means one endpoint *for validation*, not one endpoint for the whole service.

## Service methods

**Load** — `application id → { images[], type, expected brand, expected name-and-address, imported-or-domestic }`
Loads the stored record and its images, and hands the rest of the pipeline the pieces it needs. This isolates everything downstream from how the record is stored. The images are inherently plural (front/back/neck). See [Application record](interfaces/application-record.md).

**Extract** — `(image, type, things_to_look_for) → label_info`
Called once per image, behind a **swappable reader interface** — fast OCR with in-code extraction by default, a model reader by config (see [Reader provider and the latency budget](decisions/reader-provider-and-latency.md)). Reports only what it observes; no verdicts. `things_to_look_for` = the expected brand, the expected name and address, the fixed legal texts (the warning), and the list of legal designations for the drink type (see [Anchored extraction](decisions/anchored-extraction.md)). The report is the fixed label-report shape — one observation per known field — not an open-ended list.

**Aggregate** — `(label_info[]) → aggregated_info`
Combines per-image results across all labels. Carries the found / absent / unreadable state per field; detects cross-label conflicts (the same field showing different values on two labels) and marks them, rather than letting first-found win.

**Validate** — `(aggregated_info, type, expected brand, expected name-and-address, imported-or-domestic) → result`
Pure, deterministic, config-driven. Produces the result (a pass, or a fail with reasons) and holds all compliance judgments.

**Fallback (only on a would-be failure)** — deterministic-first. When Validate would fail for a specific hard field, a model is consulted to re-check it (from the OCR text) or re-read it (from the image), and the set is re-judged. It can only clear a field's failure, never add one, is budget-bounded, and is dormant unless a model key is configured. It sits outside the pure Validate step. See [Reader provider and the latency budget](decisions/reader-provider-and-latency.md).

## label_info (per image) — the reader's report, not a verdict

This is what the Extract step observes on a single label. It is not a pass/fail; it is the raw report the judge later works from.

Per field, one of three states:
- **found** — value/text as read (and roughly where on the label, if the reader can say — the judge never needs it)
- **absent** — not present on this label
- **unreadable** — a region could not be read (bad photo, glare, angle, or — for the warning — a read too poor to judge)

Plus non-verdict observations the reader may report, which feed validation as inputs, not conclusions.

## result — the verdict

Validate returns one result for the whole run: a **pass**, or a **fail** with a list of reasons. There is no separate "unsure" outcome — anything the checker couldn't confirm is a fail reason.

Each reason carries an **id** naming the exact problem (like `warning-missing` or `brand-wrong`), the **labels** it involves (empty when it isn't tied to any one label), and a few **extra values** where they help (expected vs. found for a mismatch; the value each label showed for a disagreement; the text that was read for a warning that couldn't be confirmed). A check that passes adds no reason. A cross-label disagreement is a fail reason (for example `brand-conflict`, listing every label involved).

The full shape lives on its own page: [Validation result](interfaces/validation-result.md).

The values checked against the application are the brand and the name and address; alcohol and net contents are checked for presence only, the class/type against a compiled list of legal designations, and the warning against the law. See [Application record](interfaces/application-record.md) and [Single-authority principle](concepts/single-authority-principle.md).

## Related pages

- [Verification pipeline](architecture/verification-pipeline.md)
- [Validation result](interfaces/validation-result.md)
- [One validation endpoint](decisions/single-validation-endpoint.md)
- [Reader provider and the latency budget](decisions/reader-provider-and-latency.md)
- [Anchored extraction](decisions/anchored-extraction.md)
- [Application record](interfaces/application-record.md)
