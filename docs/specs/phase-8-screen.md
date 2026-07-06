# Spec: Phase 8 — The Screen

## Goal

Build the screen a person uses: a separate React app (React 19, Ant Design, Vite, deployed to Firebase Hosting) that calls the [Phase 7 endpoints](specs/phase-7-endpoints.md). It lets someone create an application, add its label images, see it checked, and browse the list of applications with their pass/fail statuses. This is the last piece we have mapped so far — not necessarily the last the project will need (deployment, the writeup, and whatever real use surfaces may each be their own phase later).

## Layout

The familiar shape: a top bar (logo on the left; the top-right corner, where a user menu would go, stays empty — there are no users yet), a side navigation with a single item, **Applications** (the default), and the rest of the screen for the current page.

## The Applications page (the default)

- A table of applications, each row showing the fields worth seeing at a glance plus its **pass/fail status** (from its saved result), so someone can scan statuses without opening anything.
- An **Add Application** button.
- **Empty state**: on a first open, before anything has been created, the table shows a friendly "no applications yet — add one to get started" message rather than a blank grid.

## The detail page

Opened by clicking a row. Shows everything on file for that application: its fields, its label images, and its saved result — pass, or fail with each reason shown as **readable text** (turning the result's short codes into sentences, using the code-to-text piece from Phase 7). Editing the application, or changing its images, and saving re-runs the check (the backend does that on save).

## Creating and editing

A form for the fields (drink type, brand, name and address, imported-or-domestic) and for adding label images. Saving sends it to the backend, which runs the check as part of saving.

## The "validating…" dialog

Because saving runs the check, saving takes a few seconds. While it runs, show a small **"validating…"** dialog that clears into the result when it comes back. This makes the tool's work visible, and it is where the under-five-seconds promise is seen. Optionally show the time it took (from the result's run facts), which reinforces the speed.

## One backend setting this phase needs

The backend must accept requests coming from the frontend's web address — otherwise the browser blocks them (the setting sometimes called CORS). A small addition to the backend, needed for the two to talk. Allow the frontend's address, and the local address during development.

## Testing

Keep frontend tests light. The heavy logic is already tested in the backend; the screen does not need the same depth. A few checks that the main flows render and call the right endpoints are enough — do not build an elaborate UI testing setup.

## Left to decide during the build

- The exact detail-page layout, and how images are shown and uploaded.
- Whether the timing is shown to the person or just kept.
- The exact columns in the applications table.

## Not in this phase

Sign-in, users, and the two views (applicant and reviewer) — see [Users and access (deferred)](decisions/users-and-access.md). The user-menu corner stays empty.

## Related pages
- [Frontend stack](conventions/frontend-stack.md)
- [Users and access (deferred)](decisions/users-and-access.md)
- [Phase 7 — The Endpoints](specs/phase-7-endpoints.md) — the endpoints the screen calls.
- [Validation result](interfaces/validation-result.md) — what a result contains, for showing it.
