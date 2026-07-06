# Tech Stack

Records the backend toolchain and the reasoning behind each choice, including alternatives considered and rejected.

The stack is **orthogonal to the architecture**. The [verification pipeline](architecture/verification-pipeline.md) is written in stack-independent terms and imposes only a few constraints on whatever stack is chosen: swappable/local-capable extraction, a latency ceiling (~5s), and a pure, testable core. Any stack meeting those is valid; this page records the one selected.

## Runtime and language

Node.js + TypeScript.

## Web framework: NestJS

**Reasoning**
- Nest's dependency injection is a direct fit for the design's most important seam — the **swappable extraction step**. Reading the label sits behind an interface so a cloud reader can be swapped for a locally-run one without touching logic (the answer to the blocked-network constraint). In Nest this is idiomatic: bind either implementation by environment; tests bind a fake. The wiring that can feel heavyweight is, here, load-bearing.
- The **controller/service split** enforces by convention the thin-endpoint / logic-in-services structure the architecture asks for. The four-step chain maps onto services; the controller stays thin.
- **Latency is a non-issue**: the budget is dominated by the label-reading step, not framework overhead.

**Cost accepted**
Nest is heavier than Express (decorators, modules, a wiring container), and its benefits scale with app size while this app is essentially one validation endpoint plus supporting ones. Adoption is partly to learn it on a bounded project. The trade: some time spent on framework onboarding in exchange for clean wiring and enforced structure.

**Service structure and the core guardrail (ties to architecture)**
Every service is a Nest provider — a class marked `@Injectable` — including the core aggregate and validate logic. One shape, no second style (this is the Nest standard, so it needs no separate page). What keeps the core clean is not the *absence* of the framework but the **purity of its methods**: the compliance logic takes everything it needs as arguments and returns a result, without reaching into request data, outside state, or other injected classes. HTTP and request handling stay at the edge, in the controller; the compliance logic never touches them. Because a pure service has nothing handed into it, a test can build it directly and call it with no setup — which is what keeps the two-tier testing approach cheap. The thing to watch for is not a framework import; it is a compliance method that starts depending on something other than its arguments.

**Rejected alternatives**
Plain Express (lightest, but you hand-wire the injection the design needs); Fastify + a small wiring library (similar injection, less ceremony). Neither is *better* for this design — just lighter, more-manual versions of the same idea. Nest chosen partly by explicit preference to try it.

## Lint + format: ESLint (with ESLint Stylistic), no Prettier

**Reasoning**
- **ESLint** stays as the linter — the ecosystem default, with by far the deepest coverage of add-on and custom rules. Modern flat config (ESLint 9) removes the old `.eslintrc` cascade pain.
- **Prettier was dropped.** It is deliberately un-configurable — few options, by design — and it enforced style choices that go against the preferred style, with no way to override them. Removing it restores that control.
- **Formatting is handled by ESLint Stylistic (`@stylistic`).** ESLint deprecated its own built-in formatting rules in late 2023 (they still run but warn, and are no longer updated); ESLint Stylistic is the community-maintained home of those exact rules, fully configurable. So "use ESLint's styles" today means this plugin, configured to preference — not the deprecated core rules.
- Linter *speed* (the main draw of faster alternatives) is irrelevant on a project this size; add-on/custom-rule *flexibility* is the axis that matters, and now the style rules are configurable too.

**Trade accepted (honest note)**
The ESLint and typescript-eslint teams actually recommend a dedicated formatter over ESLint-for-formatting, for two reasons: it is slower (formatting through lint rules is heavier, especially with TypeScript type information), and per-rule auto-fixers can occasionally conflict where a whole-file formatter stays consistent. At this project's size both are minor — the speed difference is nothing here, and a sensible rule set rarely hits fixer conflicts — so the control is worth it. This is a deliberate "control over the mainstream default" choice.

**On the Nest default**
Nest scaffolds an ESLint + Prettier setup out of the box; we keep the ESLint half, remove Prettier, and add the stylistic plugin.

**Rejected alternative: Biome.**
A prior project hit its lack of an add-on system for custom cases. Biome has since added one (built on a pattern-matching query language), so that specific blocker is partly closed — but it is pattern-match-oriented and still maturing, so for logic-heavy custom rules ESLint remains more capable. Worth a quick re-check against the specific cases that frustrated us before finalizing, but not chosen here.

## Testing: Jest, run on-demand (no watch mode)

**Reasoning**
- Nest ships with Jest configured by default; the built-in Nest testing helper + Jest path is the most well-trodden for the outer ring.
- Nest leans on decorators and runtime metadata — exactly where the faster build-tool-based alternative gets friction.
- **No watch mode is intended**, which removes the single biggest advantage of the main alternative (the fast re-run-on-save loop). What remains of its edge is cold-run speed and module-format ergonomics — and the old "Jest is weak on ES modules" knock is weaker since Jest 30 addressed it.
- The suite is dominated by fast pure-core tests (no Nest, no image) per the [testing strategy](conventions/testing-strategy.md), so on-demand runs stay quick without a watcher.

**Rejected alternative: Vitest.**
The momentum pick for greenfield TypeScript projects, and genuinely strong (native module-format and TypeScript support, fast re-run-on-save). But its headline win (watch mode) is unused here, its speed edge is unrealized on a tiny suite, and it introduces friction with decorators and runtime metadata precisely where Nest lives. Reconsider only if this seeds a large, long-lived codebase where the re-run-on-save loop compounds daily. (The **frontend**, a separate app, does use Vitest — it fits Vite and has no Nest metadata to trip over.)

## Database: Postgres

Postgres, for the small, structured application record. The full reasoning, the rejected alternatives, and the local-versus-production setup live on [Database and local development environment](decisions/database-and-local-environment.md).

## Reading label images: Google Cloud Vision OCR by default, a model reader by config

The default reader is **Google Cloud Vision OCR** plus field extraction in plain, deterministic code. It was chosen over a model reader because the whole validation has a hard ~5s budget that an external model call cannot *guarantee* — a model's tail latency and cold start blow the ceiling, while Vision's latency is tight and predictable, so the budget holds with margin.

The reading step stays behind the swappable interface Nest's injection serves, so this is a config choice (`reader.provider`): the **model reader** — Claude via Vercel's AI SDK, which makes the model answer in the fixed label-report shape — is kept in the same slot for accuracy-critical or offline cases. A **model fallback** also backstops the rare fields the OCR path can't parse or reads too poorly, deterministic-first and budget-bounded.

Full reasoning: [Reader provider and the latency budget](decisions/reader-provider-and-latency.md). The model reader specifically: [The real reader — AI SDK and Claude](decisions/real-reader-ai-sdk-and-claude.md).

## Related pages
- [Reader provider and the latency budget](decisions/reader-provider-and-latency.md) — why OCR is the default reader and how the model backstops it.
- [Verification pipeline](architecture/verification-pipeline.md) — the pure-core boundary and the stack constraints this page answers.
- [Validation service boundaries](interfaces/validation-service-boundaries.md) — the swappable label-reading seam Nest's injection serves.
- [Testing strategy](conventions/testing-strategy.md) — the two-tier approach Jest runs.
- [Database and local development environment](decisions/database-and-local-environment.md) — the database choice and local setup.
- [The real reader — AI SDK and Claude](decisions/real-reader-ai-sdk-and-claude.md) — how the model reader talks to Claude.
