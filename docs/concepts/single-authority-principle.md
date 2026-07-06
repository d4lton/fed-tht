# Single-Authority Principle

## The principle

There is exactly one authority for whether a label is acceptable: **the TTB specification** (the federal labeling standard). The application form is not a competing authority.

This resolves a confusion that is easy to fall into — treating "does the label match the application?" and "does the label comply with TTB?" as two separate, possibly-conflicting checks. They are not two authorities. There is one authority (the standard), and the application plays a supporting role for a couple of fields — the brand name and the producer's name and address.

## Two kinds of check

Every check the system performs is one of two kinds, distinguished by **where the correct answer comes from**:

1. **Regulation checks** — the standard fixes the answer directly. The system needs only the label image(s) and the beverage type.
   - *Is the government warning present and correct?* The exact wording is fixed by law, so the label is checked against the regulation's canonical text — never against anything the applicant typed.
   - *Are the mandatory fields for this beverage type all present?*

2. **Match checks** — the standard requires a field to be present and accurate, but cannot supply the value, because there is no fixed value. A brand name can be anything; so can a producer's name and address.
   - *Does the brand on the label match the brand for this product?*
   - *Does the name and address on the label match the producer on file?* (A looser comparison — the label wraps it in words like "Bottled by …, City, ST," so we allow those extra words and ordinary formatting differences.)
   - Here the **application supplies the expected value** — not as a rival standard, but as the only available source of "what accurate means for this particular product." The regulation still defines the rule ("must be present and accurate"); the application just fills in the correct answer for this case.
   - These two — brand, and name and address — are the match checks. Alcohol content and net contents could in principle be matched too, but the application we store does not carry their values — we chose not to collect them (see [Application record](interfaces/application-record.md)). So they are checked only for **presence**: a properly formed statement is confirmed on the label, without comparing it to a stored figure.

## What this rules out

- The warning is **never** validated against the application. If an application somehow carried a slightly-off warning, the law still wins.
- Lenient brand-name matching (e.g. `STONE'S THROW` vs `Stone's Throw`) does **not** override a standard. No regulation requires the brand's capitalization or punctuation to match the application character-for-character. There is no rule there to override, so leniency is free.

## Role of the interview material

The stakeholder interviews supply performance and usability constraints (latency ceiling, simplicity, batch upload) and edge cases *within* fields. They are subordinate to the standard. Where an interview preference and the standard appear to diverge, the standard governs — but on inspection the genuine divergences are rare, because most interview points concern *how* the tool is built, not *what* counts as compliant.

## Related pages

- [Verification pipeline](architecture/verification-pipeline.md)
- [Anchored extraction](decisions/anchored-extraction.md)
- [TTB label requirements reference](concepts/ttb-label-requirements-reference.md)
- [Application record](interfaces/application-record.md)
