# Validation Result

The shape of what a validation run hands back. It is deliberately small: a result is either a **pass** with nothing more to say, or a **fail** with a list of reasons — plus a few plain facts about the run that produced it.

## The shape

A result has:

- **application** — which application was checked (its ID). The drink type isn't repeated here; it lives on the application.
- **outcome** — pass or fail.
- **reasons** — a list. Empty when the outcome is a pass; one entry for each problem when it is a fail.
- **run facts** — a few plain facts about the run itself: when it ran, how long it took, which reader read the images, and whether the model fallback assisted. See "Facts about the run" below.

The outcome is worked out from the reasons, never set on its own: any reason at all makes it a fail, and no reasons makes it a pass. So the outcome and the reasons can never disagree with each other.

## What a reason holds

Each reason has:

- **id** — a single string that names the exact problem, for example `warning-missing` or `brand-wrong`. This one string says both what was being checked and what went wrong.
- **labels** — the labels the problem involves, as a list of label IDs. Empty when the problem isn't tied to any one label (a warning missing from every label). One or more when it is (a wrong brand on one label, or two labels that disagree).
- **extra values** — a few facts, included only where they add something the id can't carry on its own. For a mismatch: what we expected and what we found. For two labels that disagree: the value each label showed.

## No readable text in the result

The result carries IDs and facts, not sentences. Turning `brand-wrong` into a readable message ("The brand on the label doesn't match the application") is the job of the part that shows the result to a person, not the checking code. This keeps wording out of the core — where it would otherwise be hard to change and impossible to translate — and lets the display side present the same result however it likes.

## The labels list does double duty

The same labels list answers two questions at once:

- **where the problem is** — the brand is wrong on label `back`.
- **which labels are involved** — the front and back labels disagree on the brand, so both are listed.

So a disagreement between labels needs no shape of its own. It's just a reason whose labels list holds every label involved, with the value each one showed among the extra values.

## A rule that didn't apply leaves no trace

A rule that doesn't apply to this product produces nothing — no reason, no note, no effect on the outcome. A domestic product is never asked the country-of-origin question, so its result simply has no country-of-origin entry. "Didn't apply" isn't a state the result records; it's an absence. See [Application record](interfaces/application-record.md) for the stored imported-or-domestic fact that decides whether that rule applies.

## Anything we couldn't confirm is a fail

There is no separate "unsure" outcome. If a required thing couldn't be confirmed — a specialty product's free-form designation we can't match against any list, or a required field on a spot too blurry to read — that is a fail with a reason, not a soft pass. A label passes only when nothing is wrong and nothing was left unconfirmed. This is the safe default for a check that stands between an application and approval.

The single fail bucket still tells the agent what to do next, because each reason's id says what kind of problem it was — something missing, something wrong, something unreadable, something we couldn't confirm. The display side can group or colour those however it wants; the verdict stays simply pass or fail.

## Facts about the run

Alongside the verdict and its reasons, a result carries a few plain facts about the run that produced it:

- **when it ran** — the time of the check.
- **how long it took** — the whole check, from start to result. Reading the images is the slow part, and a run where the model fallback stepped in is markedly slower than a plain OCR run (seconds rather than a fraction of one), which is exactly what the next two facts explain.
- **which reader read the images** — the reader that ran the fast pass, recorded by its identifier (the default `google-vision`, or the model reader — and whether it was the real reader or the stand-in).
- **whether the model assisted** — a plain flag. It is **false** for a run that finished on the fast deterministic pass alone, and **true** when the deterministic-first fallback was consulted to rescue a hard field (a missing required value, or one the OCR read too poorly to judge) — i.e. a model was in the loop. It is recorded as a boolean, *not* as the fallback model's name; naming the specific model isn't needed to explain the result. See [Reader provider and the latency budget](decisions/reader-provider-and-latency.md) for what the fallback is and when it fires.

These are not part of the verdict, and the pure judging core does not produce them: it takes label reads and returns only the outcome and its reasons, knowing nothing about timing, readers, or the fallback. The run facts are attached by the outer layer that runs and times the check; the assisted flag is carried out of the pipeline (which alone knows whether the fallback actually rescued a field) and stamped there. Keeping all of this out of the core keeps the core's tests free of timing and readers.

The per-run log records the same facts one row per run — including the assisted flag — so "which runs pulled in the model" is queryable, and slow runs can be traced to the fallback rather than guessed at.

Why they are here: speed is a graded requirement for this project (a check must finish well under five seconds), so recording the actual time each check took makes "it is fast enough" something you can see rather than claim. The reader and the assisted flag are recorded so a result can be traced to what produced it, and so a slow run has a visible cause.

### How the display presents it

The display turns these facts into something coarse on purpose. Rather than the reader identifier or a model name, it shows the *method*: **OCR** for a run that finished on the fast pass, and **OCR + Model** for a run the model assisted. The person checking a label doesn't need to know which OCR engine ran or which model helped — only whether a model was involved (and therefore why it took a little longer). The precise reader and the assisted flag stay in the recorded run facts for tracing; the surface stays plain.

A consequence worth noting: a result recorded before the assisted flag existed has no such fact, so the display treats it as an unassisted **OCR** run. Re-running the check repopulates it correctly.

## Examples

A fail with two problems (plain OCR run):

```
application: A-1042
outcome: fail
reasons:
  - id: warning-missing
    labels: []
  - id: brand-wrong
    labels: [xyz]
    expected: "Old Tom Distillery"
    found: "Old Tom Distilling Co."
ran_at: 2026-07-03T14:22:10Z
took_ms: 1840
reader: google-vision
assisted: false        # display: "OCR"
```

A pass (plain OCR run):

```
application: A-1042
outcome: pass
reasons: []
ran_at: 2026-07-03T14:25:02Z
took_ms: 1610
reader: google-vision
assisted: false        # display: "OCR"
```

A pass where the model fallback rescued a hard field — note the much larger `took_ms`:

```
application: A-1042
outcome: pass
reasons: []
ran_at: 2026-07-03T14:31:44Z
took_ms: 4425
reader: google-vision
assisted: true         # display: "OCR + Model"
```

## Reason IDs and label IDs (settled in the build)

- **The reason IDs** are fixed, one family per field (from the per-type rules): `brand-missing` / `-wrong` / `-conflict`; `name-address-missing` / `-wrong` / `-conflict`; `warning-missing` / `-wrong` / `-caps` / `-unreadable` / `-conflict`; `alcohol-missing` / `-conflict`; `net-contents-missing` / `-conflict`; `class-type-missing` / `-invalid` / `-unconfirmed` / `-conflict`; `country-of-origin-missing` / `-conflict`. The readable wording each maps to is kept out of the result, in a small code-to-text list the display side reads (served as its own small endpoint).
- **A label gets its ID from whoever attaches the image** — the front/back/neck name given when an image is added to the application. That id rides on the read the whole way through, so a reason's labels list can point at it.

## Related pages
- [Validation service boundaries](interfaces/validation-service-boundaries.md) — where this result is produced (the validate step).
- [Reader provider and the latency budget](decisions/reader-provider-and-latency.md) — the readers a run fact can name, and the deterministic-first fallback the assisted flag records.
- [Single-authority principle](concepts/single-authority-principle.md) — why "couldn't confirm" is a fail, not a pass.
- [Application record](interfaces/application-record.md) — the stored facts the checks draw on.
