# Testing Strategy

## Two kinds of test

**Logic tests (cheap, most of the coverage).** Because the reading step sits behind a swappable interface and the judging logic is pure, most checks can be tested with **hand-written label reports** — no image, no AI. You feed the combining-and-judging code a made-up report ("brand found here," "warning missing," "back label unreadable") and check the verdict. Fast, repeatable, no pixels.

**Reading tests (fewer, costlier).** A smaller set that exercises the one thing you can't fake with hand-written input: whether the reader actually reads real images correctly, including awkwardly-placed and poor-quality ones.

## A passing case and a failing case for every check

This is the heart of the logic tests: each check gets at least one label that should **pass** it and at least one that should **fail** it. Listing them side by side makes the coverage easy to audit — and the failing case is the one that proves the check actually catches something. A check with only a passing case isn't really tested.

- **Warning** — Fail: missing from every label. Fail: present but a word is changed. Fail: "GOVERNMENT WARNING" not in capital letters. Pass: the correct warning on any one label.
- **Brand** — Fail: the label's brand differs from the brand on the application. Fail: no brand found anywhere. Pass: the label's brand matches (and still passes across harmless differences like `STONE'S THROW` vs `Stone's Throw`).
- **Name and address** — Fail: the label's name and address differ from the producer on file. Fail: none found anywhere. Pass: the right name and address, even when wrapped in words like "Bottled by …, City, ST."
- **Alcohol content** — Fail: no alcohol statement present on any label. Pass: a properly formed one present. (Presence only — we don't compare the number, so there is no wrong-number case.)
- **Net contents** — Fail: none present on any label. Pass: a properly formed one present.
- **Class/type** — Fail: a phrase that isn't a legal designation ("Premium Smooth Spirit"). Fail: a specialty product's free-form name, which can't be matched against the list. Pass: a valid designation ("Kentucky Straight Bourbon Whiskey"). See [Checking the class/type designation](decisions/class-type-designation.md).
- **Country of origin** — Fail: an imported product with no country of origin shown. Pass: a domestic product without one (the rule doesn't apply). Pass: an imported product that shows one.
- **Labels agreeing** — Fail: the same field shows different values on two labels (45% vs 40% alcohol; two brand spellings). Pass: the labels are consistent.
- **Unreadable required field** — Fail: a required field sits where the image is too blurry to read (e.g. the warning under glare on the only label carrying it) — it fails rather than slipping through as a pass.
- **Sulfites (no false fail)** — Pass: a wine with no sulfite line still passes on that count; nothing about sulfites appears at all, since we have no sulfite rule. See [Application record](interfaces/application-record.md).

Most of the "fail: missing" cases above together stand in for the completeness check: a mandatory field absent from every label is a fail.

## Reading tests (real or generated images)

These confirm the reader finds what it should and admits when it can't. They are worth generating **to attack our own claims**, not at random — random labels drift to the easy middle and prove nothing:

- Fanciful name printed larger than the actual brand — the reader should still find the real brand, not the fanciful one.
- Brand set sideways, wrapped, or split across a die-cut shape — still found.
- Warning in a decorative font — still read correctly.
- Glare, an odd angle, or low light on one label — the reader marks the spot unreadable rather than guessing.

## Two cautions with generated images

1. **Write down the right answer.** When you generate a label you know what you put on it — record the correct verdict next to the image so tests run as real pass/fail, not eyeballing.
2. **Don't test the reader against itself.** If one AI makes the labels and another reads them, shared blind spots can give a falsely clean result: a clean *rendering* of a hard case is not a hard *image*. Generated labels are good evidence for the logic and placement claims; they are weak evidence for handling genuinely messy photos. For that, use a small set of real-world photos. Don't let the first stand in for the second.

## Related pages

- [Verification pipeline](architecture/verification-pipeline.md)
- [Validation result](interfaces/validation-result.md)
- [Anchored extraction](decisions/anchored-extraction.md)
- [Checking the class/type designation](decisions/class-type-designation.md)
- [Configuration as declarative data](decisions/configuration-as-declarative-data.md)
- [Application record](interfaces/application-record.md)
