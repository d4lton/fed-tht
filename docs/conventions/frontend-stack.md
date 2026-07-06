# Frontend Stack

## The stack

The screen is a **separate app** — its own React application, not served by the backend — that calls the backend's endpoints (from [Phase 7](specs/phase-7-endpoints.md)). It is built with:

- **React 19** — the current version.
- **Ant Design** — the component library (top bar, side navigation, tables, forms, dialogs, and the rest).
- **Vite** — the build tool.
- **Firebase Hosting** — where it is deployed.

## Why Ant Design

The app is a list of records with statuses, forms to create and edit them, and a detail view — which is exactly what Ant Design is built for, so its examples map almost directly onto what we are building, and its free table does more of the work than the alternatives' free tables. Its look leans "enterprise admin," which suits a federal compliance tool.

Considered alternative: MUI — familiar, and a fine fit for the same layout; the fall-back if time pressure makes reaching for a known library the safer move. Ant Design chosen to try it, and for the stronger free table and closer fit.

## Why a separate app

The frontend and backend deploy on their own schedules and live at their own web addresses. Keeping them separate is the clean split, and Firebase Hosting keeps the frontend in the same Google ecosystem as the backend's secrets.

One consequence: because the two live at different web addresses, the backend must be told to accept requests coming from the frontend's address — otherwise the browser blocks them. (This is the setting sometimes called CORS.) A small backend setting, but required for the two to talk.

## No user menu yet

The top-right corner where a signed-in person's menu would sit stays empty for now — there is no sign-in and there are no users (see [Users and access (deferred)](decisions/users-and-access.md)). That corner is where the applicant and reviewer views would live in a real version.

## Related pages
- [Users and access (deferred)](decisions/users-and-access.md)
- [Tech stack](conventions/tech-stack.md) — the backend toolchain this frontend talks to.
