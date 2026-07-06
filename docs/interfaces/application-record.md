# Application Record

The application is a **stored record with its own lifecycle**: a user fills it out online, uploads the label images, and it is saved. Everything else in the system refers to it by a unique **ID** rather than passing its contents around. Validation is handed an ID, loads the record, and works from what it finds.

## We do not duplicate the government form

TTB publishes a paper/PDF application form (form 5100.31, the "COLA" form). We treat it as a **reference for which fields exist** — nothing more. We do not read or parse that PDF, and we do not try to capture every value on it. We collect only what this project needs to do its job, and we build our own online form and our own stored record.

## What the record holds

The lean record is:

- **id** — how every other part of the system refers to this application.
- **drink type** — wine, distilled spirits, or malt beverage. This picks which set of rules applies during validation.
- **brand name** — a value we look for on the label and compare against.
- **name and address** — the producer or bottler's name and address (the form captures this, item 8). We look for it on the label and compare against it. The label usually wraps it in words like "Bottled by …, City, ST," so the comparison allows those extra words and ordinary formatting differences, rather than demanding an exact copy.
- **imported or domestic** — a fact about the product, not something we look for on the label. The checking step reads it to decide whether one rule applies: an imported product must show a country of origin, a domestic one need not. Without this fact stored, that rule could not run at all. (This is the only field of its kind — a stored fact that switches a rule on or off, rather than a value compared against the label.)
- **label images** — uploaded through the online form, stored with the record, and loaded by reference when validating. There can be several (front, back, neck).
- **last result** — the outcome of the most recent check, with its reasons and run facts (see [Validation result](interfaces/validation-result.md)). It is stored on the record so the list and detail views can show a status without re-running. Because saving runs the check (below), it is always current.
- **bookkeeping** — created/updated times and a status (for example draft vs. ready).

That is everything the project needs.

## What we deliberately leave out

- **Alcohol content and net contents.** The government form does not capture these as data, and we chose not to add them. They appear on the label and are checked there for **presence only** — we confirm a properly formed statement is present, without comparing it to a stored number. See [Single-authority principle](concepts/single-authority-principle.md).
- **Fanciful name.** The form keeps it separate from the brand. We would store it only if we also wanted to look for it on the label; left out of the first cut.
- **Whether sulfites were used.** Not stored. Its only use would be to drive the "wine must declare sulfites" rule; without that fact, we have no such rule to apply, so nothing about sulfites appears in a result — not a pass, not a fail, not a note. We treat this differently from the imported fact on purpose: the imported fact earns its place by making its rule work, and we judged the sulfite rule not worth an extra stored field for a prototype.
- **Personal contact details.** The government form collects a person's name, phone, and email. We omit these — the prototype should not store personal data it does not need.

## Rejected alternative

Capturing everything the government form carries — and adding alcohol and net-contents fields so those become compared-against-the-label checks — was considered and rejected. It buys little for a prototype: a presence check on alcohol and net contents is enough, and every extra stored field is more to collect, store, and keep clean. We kept two exceptions because they make a real check work: the imported fact (which lets the country-of-origin rule run) and the name and address (which turns a required label item from "something is present" into "the right name and address is present").

## How the ID is used

- **Validation and other endpoints** take just the application's **ID**. They load the record and work from it.
- **Only the record's own create / read / update / delete endpoints** deal with its contents directly — filling it out, editing it, uploading images.
- **Saving runs the check.** Creating an application, or changing its details or images, re-runs validation as part of saving — so the stored last result is never stale against what is on file, and there is no separate "validate" action. A failed check is still a successful save.

## Consequence

The values we compare against the label are the **brand** and the **name and address**; the imported fact is the one stored fact that switches a rule on or off. Everything else is checked against the law (the warning), against a compiled list (the class/type designation), or simply checked for being present. This keeps both the record and the checking logic small.

## Related pages
- [Single-authority principle](concepts/single-authority-principle.md)
- [Verification pipeline](architecture/verification-pipeline.md)
- [Validation service boundaries](interfaces/validation-service-boundaries.md)
- [TTB label requirements reference](concepts/ttb-label-requirements-reference.md)
