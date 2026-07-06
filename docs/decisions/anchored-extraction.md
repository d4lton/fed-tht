# Decision: Anchored Extraction

## The problem this solves

A label does not tag its own text. "OLD TOM DISTILLERY" and "Kentucky Straight Bourbon Whiskey" are just words in various sizes and positions; nothing declares which string is the brand. Working out roles from the image alone (which text is the brand? which is the class/type?) is genuinely unreliable:

- A fanciful name may be printed larger than the actual brand ("biggest = brand" fails).
- Class/type is only obvious when it's a term the reader recognizes.
- Brand vs. producer name blur when a company name is the brand.

Mislabeling which text is the brand breaks the brand check, because it compares the wrong string.

## Decision

**Anchor extraction to known values wherever one exists.** Invert the question from open-ended "what is this text?" to verifiable confirmation:

- Not "which of these strings is the brand?" but "does the text `Old Tom Distillery` (from the application) appear on this label, and where?"
- The warning is the same move against a fixed legal string: "does this exact text appear?"

Confirmation is robust where guessing at roles is shaky. The known value is searched for across the whole label, wherever it sits — placement is never assumed.

## How each check anchors

- **Match check (brand):** anchored to the application's expected brand → presence-and-location confirmation. No role-guessing.
- **Match check (name and address):** anchored to the producer's name and address on file (form item 8). A looser match than the brand — the label wraps it in words like "Bottled by …, City, ST," so we confirm the name and place appear, allowing the extra words and ordinary formatting differences.
- **Warning:** anchored to fixed legal text → pure confirmation.
- **Alcohol content and net contents:** confirmed **by their format** (`45% Alc./Vol.`, `750 mL`). These are **presence** checks — we confirm a properly formed statement appears, without comparing it to a stored value, because the application doesn't carry these (see [Application record](interfaces/application-record.md)).
- **Class/type designation:** anchored to a compiled list of the legal designations (see [Checking the class/type designation](decisions/class-type-designation.md)). The designations are among the known values searched for in the label text, so an ordinary named spirit — "bourbon whiskey" and the like — confirms just as the brand does. The one genuinely unanchored case is a **specialty** product, which the rules let carry a free-form statement of composition or fanciful name; there is no list to check those against, so they stay a guess. A required thing we can't confirm can't pass, so an unconfirmable specialty designation is a **fail** with a reason of its own — not a guess dressed up as a pass. A clearer photo won't fix that, because the difficulty is matching, not reading; the display can present it gently ("please verify the class/type").

## How reading and anchoring fit together

Reading and anchoring are two steps. First the reader turns the image into text (or, for the model reader, into observations). Then the known values — the expected brand, the expected name and address, the fixed warning wording, and the legal designations — are searched for across that text, wherever they appear.

With the default reader (Google Cloud Vision OCR), the reader returns flat text and the searching is done in plain, deterministic code — real field parsers, not position guesses. With the model reader, the model does the reading and the confirming together in one call, answering in the fixed report shape. Either way the principle is the same: known values are found anywhere on the label, never by position. See [Reader provider and the latency budget](decisions/reader-provider-and-latency.md).

An open-ended "what other fields are here" pass, for completeness, is the weaker, clearly-caveated half — not the foundation the confirmable checks stand on.

## Connection to no-placement config

Anchoring is *why* configuration never needs to encode placement: you search for a known thing across the whole label, so creative placement is just a different spot the search finds it in. See [Configuration as declarative data](decisions/configuration-as-declarative-data.md).

## Related pages

- [Configuration as declarative data](decisions/configuration-as-declarative-data.md)
- [Checking the class/type designation](decisions/class-type-designation.md)
- [Reader provider and the latency budget](decisions/reader-provider-and-latency.md)
- [Single-authority principle](concepts/single-authority-principle.md)
- [Validation result](interfaces/validation-result.md)
- [Testing strategy](conventions/testing-strategy.md)
- [Application record](interfaces/application-record.md)
