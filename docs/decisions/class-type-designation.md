# Decision: Checking the Class/Type Designation

## What this is about

Every distilled spirits label must carry a class/type designation — the words that say what the product legally is, like "Kentucky Straight Bourbon Whiskey." This is a firm federal requirement (27 CFR Part 5, §5.63), and the allowed designations are defined by the "standards of identity" in the same rules (subpart I). It sits in the same eye-level area as the brand name and alcohol content, so it is core required information, not a nicety.

## The decision

We check the designation against a compiled list of the real, legal designations — not merely that some designation-shaped words are present.

The reader is handed that list as things to look for, the same way it is handed the brand name and the exact warning wording. If a legal designation appears on the label, the check is satisfied. If the words in the designation spot match nothing on the list, it is not.

## Why not just "something is present"

The cheaper option — accept the label if the reader sees any designation-shaped text — was considered and rejected, because it does not actually meet the requirement. A label reading "Premium Smooth Spirit" in that spot would sail through, even though that is not a real designation. Confirming that *a* designation is present is not the same as confirming a *valid* one is present, and the rule calls for a valid one. Since this project needs the requirement genuinely met now, "something is present" is too weak.

## Why this is doable for the prototype

The legal spirit designations are a known, finite set — whisky and its sub-kinds (bourbon, rye, and so on), vodka, gin, rum, brandy, tequila, and a handful more. Compiling that list for spirits is a bounded, afternoon-sized task, not a research effort. The prototype's example is a bourbon, so spirits is the type we compile.

A designation on a real label is usually a phrase built around a core term — "Kentucky Straight Bourbon Whiskey" is a place, plus "straight," plus the core ("bourbon whiskey"). So the check looks for a known core designation inside the phrase, allowing the surrounding words, rather than demanding an exact whole-string match.

## The one part that stays unconfirmable

The rules themselves let a product that doesn't fit any standard type — a "specialty" product — be designated with a statement of composition or a distinctive/fanciful name. Those are open-ended by design, so there is no list to check them against. A specialty designation therefore can't be confirmed, and — like any required thing we can't confirm — it comes out as a fail that asks for a human look. This is a small, correct remainder, not the whole field failing: ordinary named spirits confirm cleanly, and only the deliberately open-ended designations get flagged.

## Invalid vs. unconfirmed (how the two failures are told apart)

Two different failures both mean "not a legal designation," and the judge keeps them separate:

- **`class-type-invalid`** — a non-designation phrase sitting where the designation should be (like "Premium Smooth Spirit"). It is presented as a real designation but matches no legal core term.
- **`class-type-unconfirmed`** — a specialty product's free-form or fanciful name, which by design there is no list to match against; a human is asked to confirm it.

The judge decides validity itself, by looking for a legal core term inside the phrase — it does not trust the reader's own verdict. When a found class/type has no core term, the reader's **basis** splits the two: a read the reader admits it only recognized on its own (basis = guess) is *unconfirmed*; a read presented as a confirmed designation that still isn't legal is *invalid*. This puts a small requirement on the reader: mark a specialty/free-form designation as a guess, and mark a class/type confirmed only when it matched the list. See [Anchored extraction](decisions/anchored-extraction.md) for confirmed vs. guess.

## Two labels agreeing: conflict is judged loosely

Where a designation appears on more than one label, the labels must agree — a front reading "Bourbon Whiskey" against a back reading "Rye Whiskey" is a genuine `class-type-conflict`. But agreement is judged with **containment leniency** (the field's `match: loose`, the same leniency the producer name and address use): one label reading a *fragment* of the other's designation is **not** a disagreement. This matters because OCR routinely breaks a designation across lines — "Straight Rye Whisky" read as "Straight Rye" on a label where the design stacks the words — and the fast reader captures the line it lands on. Comparing those two strings for exact equality would flag a false conflict; comparing them for containment (one wrapping the other) does not, while still catching two genuinely different designations.

## Consequence

Class/type is no longer the lone field with nothing to check against. It is anchored to the list of legal designations, so for ordinary products it confirms like the brand and the warning do. Only specialty free-form designations remain in the "can't confirm, so a human checks" bucket.

## To compile during the build

- The list of legal spirit designations (the standards-of-identity classes and types), with the core terms the check looks for.

## Related pages
- [Anchored extraction](decisions/anchored-extraction.md) — how the reader confirms known things instead of guessing.
- [Validation result](interfaces/validation-result.md) — an unconfirmable required field (a specialty designation) is a fail with a reason.
- [TTB label requirements reference](concepts/ttb-label-requirements-reference.md) — where class/type sits among the mandatory fields.
- [Label reading report](interfaces/label-reading-report.md) — confirmed vs. guess for what the reader reads.

Sources: 27 CFR Part 5 — §5.63 (label must bear the class, type, or other designation); subpart I / §5.141 (standards of identity that define the allowed designations).
