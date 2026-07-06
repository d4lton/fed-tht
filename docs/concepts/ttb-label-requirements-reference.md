# TTB Label Requirements Reference

This page holds the ground-truth facts the validator depends on. It is reference data, not logic. When the validator checks "warning correct" or "mandatory fields present," this is the source it is checking against.

## Government health warning — exact text

Fixed by regulation (27 CFR 16.21). Must read, word for word:

> GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

### Formatting rules (27 CFR 16.22)

- The words **GOVERNMENT WARNING** must be in capital letters and **bold**.
- The remainder of the statement must **not** be bold.
- It must appear as one **continuous** statement.
- It must be readily legible, on a contrasting background, not compressed.
- Minimum type sizes scale with container size (roughly: 1 mm for containers ≤ 237 mL; 2 mm up to 3 L; 3 mm above 3 L).

### Note on "exact"

The regulation writes the body in sentence case, but labels are permitted to print the whole statement in all caps, and many do. So the matcher must compare the *words* exactly while being deliberate about case: enforce capitals on "GOVERNMENT WARNING," but do not reject a label merely because the rest is capitalized. Collapsing this distinction produces false rejections.

## Mandatory fields by beverage type

The required field set **depends on the beverage type**. A completeness check cannot run without knowing the type first.

**Common to all three types:** brand name; class/type designation; alcohol content; name and address of producer/bottler; net contents; government warning; country of origin (imports only).

**Spirits add** (conditionally): commodity statement; color-ingredient disclosures; age statement — each only when applicable.

**Wine adds:** a **"Contains Sulfites"** declaration when sulfites are present at or above threshold. No equivalent on beer or spirits.

**Beer** is close to the common set; most nuance is in the class/type and producer name-and-address rules.

## Conditional requirements: when a rule depends on an outside fact

Some obligations only apply under a condition, and that condition depends on a fact that isn't reliably readable from the label. Whether we hold that fact decides whether the rule exists for us at all.

- **Country of origin** — required only for imported products. We store whether the product is imported (see [Application record](interfaces/application-record.md)), so this rule is real: if the product is imported, the label must show a country of origin, and a missing one is a fail; if the product is domestic, the rule does not apply and nothing about country of origin appears in the result.
- **Sulfite declaration (wine)** — required only if sulfites were used. We do not store that fact, so we have no sulfite rule to apply. We can neither confirm a sulfite statement nor fault its absence, so nothing about sulfites appears in the result at all — not a pass, not a fail, not a note. It is simply not part of what we check.

The two look alike but land differently, on purpose: the imported fact is stored because it makes its rule work, while the sulfite fact was judged not worth an extra stored field for a prototype — so that rule doesn't exist here. See [Configuration as declarative data](decisions/configuration-as-declarative-data.md) for how the rules carry each condition's source.

## Sources

- 27 CFR Part 16 (warning statement + formatting): ecfr.gov, Title 27, Part 16, §16.21 and §16.22.
- Distilled spirits mandatory fields: ttb.gov distilled-spirits labeling guidance; 27 CFR Part 5.
- Wine: 27 CFR Part 4. Beer/malt beverages: 27 CFR Part 7.

## Related pages

- [Single-authority principle](concepts/single-authority-principle.md)
- [Verification pipeline](architecture/verification-pipeline.md)
- [Application record](interfaces/application-record.md)
