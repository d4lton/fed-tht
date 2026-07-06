# Decision: One Validation Endpoint, Images as a Set

## Scope

This decision is about the **validation path only**. The service will also have other, unrelated endpoints (sign-in, frontend support, and the application record's own create/read/update/delete); those are not what this page is about. "One endpoint" here means one endpoint *for validation*.

## Decision

Validation is served by a single endpoint. The request carries an **application ID**; the stored record supplies the drink type, the values to look for (the brand, and the name and address), and the **set** of label images. There is no separate "validate one image" endpoint.

## Considered alternative

A standalone "validate one image" endpoint sitting alongside a "validate application" endpoint.

## Why the alternative was rejected

TTB allows required information to be spread across several labels (front, back, neck); the requirement is that the information appears *on the container*, not on any one label. A validator that judged a single label on its own would wrongly reject compliant multi-label products — the exact failure that made agents abandon a prior tool.

So completeness has to be judged across all the labels together. Once the core works on a set, a single image is just a set of size one, and a second endpoint adds surface area with no benefit.

## Consequences

- **Extraction** stays per-image and independent (can run in parallel).
- **Aggregation/validation** work across the set; presence means "on any label," which introduces cross-label conflict handling and cross-label unreadable handling (see [Verification pipeline](architecture/verification-pipeline.md)).
- The **stored record holds the full set of label images**; loading it by ID yields them all at once.
- The values checked against the application are the **brand** and the **name and address**; everything else is checked against the law, against a compiled list (the class/type designation), or for presence.

## Note

Because the request carries only an ID, the endpoint doesn't receive label data or images directly — it loads them from the stored record. The record's own create/read/update/delete endpoints handle filling it out and uploading images; those are separate from validation. See [Application record](interfaces/application-record.md).

## Related pages

- [Verification pipeline](architecture/verification-pipeline.md)
- [Validation service boundaries](interfaces/validation-service-boundaries.md)
- [Application record](interfaces/application-record.md)
