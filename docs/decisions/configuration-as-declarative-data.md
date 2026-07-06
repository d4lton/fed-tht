# Decision: Configuration as Declarative Data, Not a DSL

## Decision

Per-type configuration is **declarative data** with three facets per field. It is not a domain-specific language and contains no computation.

The three facets:
1. **Shape** — what fields a label of this type can carry and their expected format (alcohol is a percentage, net contents is a volume). Also the barest hint given to extraction.
2. **Obligation** — when a field is required, and what makes it correct.
3. **Find-strategy** — how the field is located:
   - `from_expected` — anchor to an application value (the brand; the name and address).
   - `fixed_text` — anchor to a known legal string (the warning).
   - `from_list` — anchor to a compiled list of allowed values (the legal class/type designations).
   - `by_format` — find by distinctive shape (alcohol, net contents).
   - `none` — open-ended recognition, for the rare field with nothing to match against (a specialty product's free-form designation).

   See [Anchored extraction](decisions/anchored-extraction.md).

## Considered alternative

A DSL or expression language for rules, reached for because the rules "felt like they were getting complex."

## Why the alternative was rejected

The complexity was misdiagnosed. What grew was a new per-field *attribute* (find-strategy), not a new kind of logic. The test applied: **is the config describing things or computing things?** Everything specified so far is describing — "required when imported," "correct means matches this text case-insensitively," "anchored to the expected value." None of it composes booleans, operators, or cross-field arithmetic. A config that describes is data; a config that computes is a programming language you now have to maintain an interpreter for.

## Hard rules

- **No placement, ever.** Configuration describes a field's identity, value, and obligation — never its location on the label. Encoding position is how you get whack-a-mole: every creatively-placed label becomes a new rule. Finding text anywhere on an image is the vision model's job, not the config's. If you catch yourself adding config because a label put something in an unexpected place, delete the placement assumption instead. (Even the one field with nothing to anchor to — a specialty product's free-form designation — gets no placement rules; it simply can't be confirmed, so it comes out as a fail asking for a human look. See [Anchored extraction](decisions/anchored-extraction.md).)
- **Conditions stay flat.** Conditions in the obligation facet are named tags (e.g. `imported`, `sulfites-present`) with a declared **source** for the answer (label / application / not available to the prototype). They do **not** compose. If a condition's answer isn't available to us, we have no rule to apply — nothing about it appears in the result (like the sulfite declaration, whose fact we don't store), rather than a guess or an invented outcome.
- **Shared field vocabulary.** All three facets key off one canonical field name so they cannot silently desynchronize.

## Implemented types

All three drink types now ship as rule data — `distilled-spirits`, `wine`, and `malt-beverage` — each a rules file plus its own class/type designation list, resolved by the rules provider at startup. Adding a type is exactly: drop in its `*.rules.yaml` and `*-designations.yaml`, and a one-line loader. The three share the government-warning fixed text and the canonical field vocabulary; they differ only where the regulation does — the designation lists, and one obligation (below). A type with no compiled rules is a clear startup-checked error, never a silent pass. (Before wine and malt shipped, saving a wine or malt application threw mid-request — a 500 — because no rules were compiled for it.)

Deliberate regulatory simplifications, honest about the boundary of the prototype:
- **Malt beverages do not require alcohol content.** Under 27 CFR Part 7 an alcohol statement is permitted but not federally mandated (some states require it), so the malt rule set omits the field rather than model it as always-required — a malt label that leaves it off is still compliant. Wine and distilled spirits do require it.
- **Wine's sulfite declaration and appellation of origin are not modelled.** Both would need fields beyond the shared vocabulary. The sulfite case is consistent with the flat-conditions rule above: its fact isn't stored, so no rule applies rather than a guess.

## Re-evaluation trigger

The day a rule genuinely needs to *compute* (compose conditions, reference other conditions, do arithmetic) is the deliberate, documented moment to evaluate a small expression language — as an evidence-based decision, not a foundation poured on speculation. We are not there.

## Related pages

- [Anchored extraction](decisions/anchored-extraction.md)
- [Checking the class/type designation](decisions/class-type-designation.md)
- [TTB label requirements reference](concepts/ttb-label-requirements-reference.md)
- [Verification pipeline](architecture/verification-pipeline.md)
