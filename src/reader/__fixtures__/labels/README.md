# Label image fixtures (reading tests)

Small, generated label images for the costly "reading tests" — the ones that
actually call the model. The bulk of coverage stays in the cheap
hand-written-report tests (Phases 2 and 4) and the mock-model reader test, which
never call the model.

Each image's **correct** verdict is written down here so the tests assert real
pass/fail rather than eyeballing (see the Testing Strategy caution).

## Clean bourbon → **pass**

- `front-clean.png` — brand "Old Tom Distillery", "Kentucky Straight Bourbon
  Whiskey", "Distilled and Bottled by Old Tom Distillery, Bardstown, KY",
  "45% Alc./Vol. (90 Proof)", "750 mL".
- `back-clean.png` — the exact government warning.

Run through read → combine → judge against the expected values (brand
"Old Tom Distillery", name/address "Old Tom Distillery, Bardstown, KY",
domestic) it passes.

## Mangled bourbon → **fail** (`brand-wrong`, `warning-missing`)

- `front-broken.png` — same as the clean front but the brand reads
  "Spring River Spirits" (≠ the expected brand).
- `back-broken.png` — decorative back copy with **no** government warning.

## Note on generated images

These are generated (ImageMagick), so they are good evidence for the reading
*logic and anchoring* but weak evidence for genuinely messy real-world photos —
a clean rendering of a hard case is not a hard image. For that, drop a few real
photos in here and extend the tests. Regenerate with the `magick` commands in
the Phase 5 build history if the wording ever changes.
