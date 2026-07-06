# Label Reading Report

This is what the reader produces for a **single label image** — one report per picture. The step that combines the labels later stacks these up and judges across them. Everything here is "what I saw," never "pass" or "fail"; the judging happens afterward.

In the pipeline this is the output of the reading step (called `label_info` on the [validation service boundaries](interfaces/validation-service-boundaries.md) page). This page gives its full shape.

## The shape

One report per label image holds:

- **label** — which label this is (its ID), so the combining step knows where each observation came from.
- **fields** — the list of things the reader looked at, each with what it saw (below).
- **notes** — anything general it noticed that isn't about one field, such as "the whole image is dark." Optional.

Each entry in **fields**:

- **field** — which thing this is about (brand, name and address, warning, alcohol, net contents, class/type, and so on).
- **state** — one of three: **found**, **absent** (not on this label), or **unreadable** (couldn't read the spot where it might be).
- **text** — what it actually read, when it found something.
- **where** — roughly where on the label, if it can say. Optional.
- **basis** — how it knows what it read: **confirmed** (it matched something known — the expected brand, the name and address on file, the exact warning wording, a legal class/type designation from the compiled list, or a properly shaped alcohol or net-contents statement) or **guess** (it recognized this on its own, with nothing fixed to check against — mainly a specialty product's free-form designation).

## Examples

Front label of a bourbon:

```
label: front
fields:
  - field: brand
    state: found
    text: "Old Tom Distillery"
    where: top center
    basis: confirmed
  - field: name and address
    state: found
    text: "Bottled by Old Tom Distillery, Bardstown, KY"
    basis: confirmed
  - field: warning
    state: absent
  - field: alcohol
    state: found
    text: "45% Alc./Vol. (90 Proof)"
    basis: confirmed
  - field: class/type
    state: found
    text: "Kentucky Straight Bourbon Whiskey"
    basis: confirmed
notes: []
```

Back label, where the warning lives:

```
label: back
fields:
  - field: warning
    state: found
    text: "GOVERNMENT WARNING: (1) According to the Surgeon General..."
    basis: confirmed
notes: []
```

## Why it's shaped this way

**The states are observations, not judgments.** "Warning absent" on the front is not a failure — the back carries it, and only the combining step, looking across both, decides whether the warning requirement is met. Keeping the reader's words purely descriptive is what stops it from accidentally judging. See [Single-authority principle](concepts/single-authority-principle.md) and [AI extracts, the algorithm judges](decisions/ai-extracts-algorithm-judges.md).

**The text is what lets the combining step catch two labels disagreeing.** If the front reads the brand as "Old Tom Distillery" and the back reads "Old Tom Distilling Co.," that shows up by comparing the text for the same field across the two reports — and a disagreement is a fail (see [Validation result](interfaces/validation-result.md)).

**The basis carries the confirmed-versus-guess line.** It records whether the reader matched a known thing or just took its best shot. Most fields come back confirmed — the brand and name/address against the values on file, the warning against its fixed wording, and an ordinary class/type against the compiled list of legal designations. The main thing left as a guess is a *specialty* product's free-form designation, which the rules let be a made-up name, so there is nothing to match it against. A required field that only ever comes back as a guess can't be confirmed, so the judge fails it — which is how a specialty designation gets flagged for a human (see [Anchored extraction](decisions/anchored-extraction.md) and [Checking the class/type designation](decisions/class-type-designation.md)).

## Small conventions

- For the things the reader was **told** to look for (brand, name and address, warning), it always gives a state — even if that state is "absent" — so an absence is said out loud rather than left as a gap. For extra things it just happens to notice, it lists only what it found.
- **where** is filled in when easy and skipped when not; the judge never needs it, but it helps the display highlight the spot later.
- **basis** has just the two values, confirmed or guess — deliberately no shades of doubt, so the judge never has to interpret how sure a guess was.

## Related pages
- [Validation service boundaries](interfaces/validation-service-boundaries.md) — where this fits in the pipeline (the reading step's output).
- [Validation result](interfaces/validation-result.md) — the verdict the combining step produces from these reports.
- [Anchored extraction](decisions/anchored-extraction.md) — confirmed vs. guess.
- [Checking the class/type designation](decisions/class-type-designation.md) — why an ordinary class/type is confirmed and only specialty names are guesses.
- [AI extracts, the algorithm judges](decisions/ai-extracts-algorithm-judges.md) — why this stays observation.
