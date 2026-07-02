# Core

Home for the **pure compliance core** — the combine-and-judge logic (the
aggregate and validate steps of the [verification
pipeline](../../CLAUDE.md)).

Rules for anything that lives here:

- **No framework imports.** Nothing in `core/` may import from `@nestjs/*` or
  otherwise reach into HTTP, storage, the network, or request data. The core is
  plain functions/classes over plain data: same input, same result.
- **Everything comes in as arguments.** Each judging method takes what it needs
  as parameters and returns a result. That purity is what keeps it cheap to
  unit-test — a test builds it directly and calls it, no Nest setup.

No core logic exists yet (Phase 1 is the skeleton). This directory just gives
that logic a clean place to live so later phases don't have to move things.
