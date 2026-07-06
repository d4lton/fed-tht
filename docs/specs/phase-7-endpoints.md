# Spec: Phase 7 — The Endpoints

## Goal

Give the app a web surface: the endpoints that let a person (and, next phase, the screen) put in an application, add its images, look at it, and see it checked. Saving an application runs the check as part of saving, so a saved application always carries a current result. This is the last backend phase before the screen.

## The endpoints

- **List the applications** — return the set on file, each with the fields worth showing at a glance and its last result, so a grid can show a status per row (passed / failed) without running anything.
- **Create an application** — take its details (drink type, brand, name and address, imported-or-domestic), save it, and run the check as part of saving; return the saved application with its result.
- **Add or change an application's images** — attach or replace label images on one by its id (kept via the image storage from Phase 6), and re-run the check as part of the change.
- **Look at one application** — return everything on file for an id: its fields, its images, and its saved result.
- **Result codes to readable text** — a small way to turn the result's short codes (like `warning-missing`) into readable sentences for whatever shows a result. This can be its own small endpoint that returns the code-to-text list, or a file the screen reads — a build-time detail.

## Saving runs the check

Creating an application, or changing its details or images, runs the validation as part of the save. So:

- A saved application always has a current result; there is no "not yet checked" state and no separate check action.
- A change cannot be saved without re-checking, so a saved result never goes stale against what is on file.
- Saving therefore takes a few seconds (the check runs, including reading the images). That is expected and within budget.
- A failed check is still a successful save. Saving means "stored, and here is its result — pass or fail," not "the label is good." An application that fails its check is a normal saved application carrying a failing result.

## Timing and a log of checks

- Each result records its run facts — when it ran, how long it took, and which model read the images — per [Validation result](interfaces/validation-result.md).
- A running log of checks keeps one entry per run: which application, when, how long, which model, and the outcome. The result on an application answers "how did this one do"; the log answers "how is the tool performing across many runs," which is the evidence for the speed requirement. This is the most droppable piece if time is short.

## Users and access

None in this phase — no sign-in, no roles, one shared open space (see [Users and access (deferred)](decisions/users-and-access.md)). Build the endpoints so that adding a "who are you, what may you do" check in front of them later is additive, not a rewrite; do not assume a single anonymous user so deeply that separating users would mean unpicking it.

## Tests

- Create an application and get back a saved one with a result.
- The list shows the created applications with their statuses.
- Look at one returns its fields, images, and result.
- Changing an application re-runs the check and replaces the result.
- A created application that should fail comes back saved with a failing result (a failed check is not a failed save).
- Use the stand-in reader for these, to keep them cheap and off the real model.

## Left to decide during the build

- Whether the code-to-text piece is a small endpoint or a file.
- The exact fields the list returns per row (enough for a grid, no more).
- How the running log is kept (a small table alongside the results).

## Not in this phase

The screen itself — the layout, the grid, the "validating…" dialog, the empty-list message — is Phase 8. No sign-in or roles (see the decision page).

## Related pages
- [Application record](interfaces/application-record.md)
- [Validation result](interfaces/validation-result.md)
- [Verification pipeline](architecture/verification-pipeline.md)
- [Users and access (deferred)](decisions/users-and-access.md)
