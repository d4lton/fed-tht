# Decision: AI Extracts, the Algorithm Judges

## Decision

The AI does exactly one job: read the label and report what is printed on it. **Every compliance verdict is made by plain, deterministic code.** The AI never decides whether a label passes.

## Considered alternative

Let the AI produce compliance conclusions directly — e.g. return "the warning looks fine" or "this label is compliant." This is the intuitive design and was the initial framing.

## Why the alternative was rejected

The authority for compliance is the law (see [Single-authority principle](concepts/single-authority-principle.md)), and a compliance verdict must be **auditable and testable**. If the model decides compliance:

- The verdict lives inside something that cannot be unit-tested against known inputs and cannot be fully explained to a regulator.
- The exact-warning check becomes a fuzzy judgment instead of what it should be: a deterministic comparison against the one legal wording.

If the model only transcribes, the verdict is plain code comparing that transcription to fixed reference data — testable and defensible.

## Consequence

- Extraction returns observed text and states (found/absent/unreadable), never conclusions.
- The AI may return **non-verdict observations** ("couldn't read this region," "text appears small"). These feed the algorithm as inputs; they are not rulings.
- All rules live in the validate step. This keeps the compliance brain in a pure, testable layer.

## Related pages

- [Single-authority principle](concepts/single-authority-principle.md)
- [Verification pipeline](architecture/verification-pipeline.md)
