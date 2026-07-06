# Verification Pipeline

The backend is built first and is fully testable before any frontend exists. Validation runs through a single endpoint over a chain of service methods. (The service will also have other endpoints — sign-in, frontend support, and the application record's own create/read/update/delete — which these design pages don't cover; "one endpoint" below always means the validation one.) Only the edges of the chain touch the outside world — loading the stored record, and reading the images; the middle, where the compliance decisions live, is plain, deterministic logic.

## The chain

1. **Load the application (by ID)** — the request carries the application's ID. This step loads the stored record and its label images, then takes out the beverage type, the expected brand, the expected name and address, and the imported-or-domestic fact. It is the boundary between stored data and the clean inputs the rest of the code wants; nothing downstream needs to know how the record is stored. See [Application record](interfaces/application-record.md).

2. **Extract, per image** — `(image, type, things-to-look-for) → label info`. Called once per image. The **reader reads and reports only**; it makes no compliance judgments. Which reader fills this slot is a config choice — the default is fast OCR (Google Cloud Vision) with field extraction in plain code, with a model reader as the alternative — but downstream is identical either way. Type is at most a thin hint. See [Anchored extraction](decisions/anchored-extraction.md) for what "things-to-look-for" means, and [Reader provider and the latency budget](decisions/reader-provider-and-latency.md) for which reader and why.

3. **Aggregate** — combine the per-image label infos into one view across all labels. Mandatory information may be spread across front/back/neck labels, so presence is judged across the union, not per image. Carries up the found / absent / unreadable states, and detects **cross-label conflicts** — the same field showing different values on two labels — rather than letting first-found win. A conflict is marked as such and handed to validation, which treats it as a failure (see the settled question below).

4. **Validate** — `(aggregated info, type, expected brand, expected name and address, imported-or-domestic) → result`. Pure and deterministic. **Every compliance verdict lives here and nowhere else.** Schema- and rules-driven; see [Configuration as declarative data](decisions/configuration-as-declarative-data.md).

## A fallback on a would-be failure (deterministic-first)

The chain above is the whole story for a passing label, and it stays inside the latency budget on its own. Only when the fast pass would **fail** for a specific hard field is a model consulted — to re-check a field the OCR text has but the parser missed, or to re-read (with vision) a field the OCR read too poorly to judge. Whatever it confirms replaces that field's read and the set is re-judged. This can only clear a field's failure, never introduce one, so it can't turn a pass into a fail; it is budget-bounded and dormant unless a model key is configured. It sits outside the pure core (it reaches the model and the images), so the compliance "brain" stays pure. Full design: [Reader provider and the latency budget](decisions/reader-provider-and-latency.md).

## Why this shape is testable

The two outside-touching steps sit at the edges: loading the record (step 1) and reading the images (step 2). The middle — aggregate and validate (steps 3 and 4) — is logic over plain data. That compliance "brain" is therefore testable with data in, data out: no storage, no images, no HTTP. This is the backend-first, test-before-frontend posture expressed as method boundaries. See [Testing strategy](conventions/testing-strategy.md).

## Boundaries held firm

- **The reader describes, the algorithm judges.** Extraction reports what is on the label; aggregation organizes; validation rules. A compliance call must never appear in the reader or the endpoint. This holds whether the reader is OCR-plus-code or a model. See [AI extracts, algorithm judges](decisions/ai-extracts-algorithm-judges.md).
- **Extract and validate stay separate methods** even though the endpoint always runs both, because they answer different questions: extraction = observed reality; validation = reality vs. the standard and the expected values. See [Single-authority principle](concepts/single-authority-principle.md).
- **Three-state field results.** Each field can be *found*, *absent*, or *unreadable*. These are distinct outcomes end to end; collapsing "unreadable" into "absent" causes false rejections. (The warning uses `unreadable` for a read too poor to judge — distinct from a genuinely wrong warning; see [Reader provider and the latency budget](decisions/reader-provider-and-latency.md).)

## Multiple images

Extraction is per-image and independent (can run in parallel if the latency budget is tight). Validation operates on the whole set. A single label is simply a set of size one — no separate single-image path. See [One validation endpoint](decisions/single-validation-endpoint.md).

## Constraints this architecture places on the tech stack

The stack is chosen separately, but the architecture imposes these requirements on it:

- **Swappable, local-capable extraction.** The extraction step sits behind an interface so a cloud vision service can be swapped for a locally-run model without touching logic. This is required because the deployment network blocks much outbound traffic.
- **Latency ceiling.** End-to-end result in roughly 5 seconds; a heavier prior vendor pilot was abandoned for being too slow. This caps how heavy the per-image path can be, motivates parallel extraction, and is the reason the default reader is fast OCR rather than a model.
- **Strong testing ergonomics.** The pure core will carry a large body of unit tests; the stack should make those cheap to write.

## Settled questions

- **Cross-label conflict policy.** Settled: if the same field appears on two labels with different values (e.g. 45% vs 40% alcohol), that is a **fail**. The aggregator detects the disagreement and validation returns a fail — it does not silently pick one value, and it does not defer to a human. (For class/type, "different values" is judged loosely — one label reading a fragment of the other's designation is not a disagreement; see [Checking the class/type designation](decisions/class-type-designation.md).)
- **Application input shape.** Settled: the application is a stored record referenced by ID — see [Application record](interfaces/application-record.md).

No open questions remain at this level.

## Related pages

- [Single-authority principle](concepts/single-authority-principle.md)
- [Validation service boundaries](interfaces/validation-service-boundaries.md)
- [Reader provider and the latency budget](decisions/reader-provider-and-latency.md)
- [Testing strategy](conventions/testing-strategy.md)
- [Application record](interfaces/application-record.md)
