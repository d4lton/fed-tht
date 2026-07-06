# TTB Label Verification — Approach, Tools, and Trade-offs

A reader-facing summary of the project: what it does, the choices behind it, the tools, the assumptions made, and the honest limitations. It condenses the design record into something that reads start to finish, for a reviewer who shouldn't have to walk the whole wiki. The fuller reasoning lives in the pages linked at the end.

## What it does

The service checks beverage alcohol labels against federal TTB labeling requirements. An agent submits an application — its details plus the label images — and the service returns a plain result: pass, or fail with specific reasons, such as a missing government warning, a brand that doesn't match the application, or two labels that disagree with each other.

## Approach

A few decisions shape everything else.

**The regulation is the authority.** Where the federal standard fixes what a label must say — the exact government warning wording, the set of legal class/type designations — the standard is the source of truth, not the application and not any one reviewer's preference. The application supplies an expected value only where the standard can't: the brand, and the producer's name and address, which are specific to each product. This keeps the checks grounded in law rather than in habit.

**The reader describes; the code judges.** The part that reads a label only reports what it sees — this text is here, that text is there. Every pass/fail decision is made afterward, by plain, deterministic code. Nothing about compliance is left to a model's judgment. For a tool that stands between an application and a federal approval, that matters: the decisions are auditable, testable, and repeatable, and a model can't quietly change a verdict.

**Confirm known values; don't guess roles.** A label doesn't tag its own text — nothing on it declares "this is the brand." Rather than guess which text is which, the checks confirm known values: does the expected brand appear on the label, and where? Does the exact warning text appear? Values are looked for anywhere on the label, never by an assumed position — so a creative layout is just a different spot the search finds them in.

**Two outcomes, and anything unconfirmed fails.** A result is pass, or fail-with-reasons. There is no "unsure" or "needs review." If a required thing couldn't be confirmed — a specialty product's free-form name that matches no legal list, or a field on a spot too blurry to read — that is a fail, not a soft pass. For something guarding an approval, the safe default is: confirmed, or it doesn't pass.

**A small, pure core.** The steps are: load the application, read each image, combine the reads across all the labels, and judge. The combine-and-judge core takes plain data and returns a plain result — it touches no database, no network, and no images. That is what keeps it quick to test and easy to trust.

## The reader, and the five-second rule

Speed was a hard requirement, and a pointed one: the agency's last tool attempt died because it took thirty to forty seconds per label, so agents went back to doing it by eye. A check has to finish well under five seconds, or nobody uses it. Five seconds is a ceiling to stay far beneath, not a target to just clear.

The reader was first designed around a vision-capable AI model reading each label. In practice, a model call can't *guarantee* that ceiling — its slow cases and occasional cold starts run past five seconds, and "rarely over" still fails a hard limit. So the default reader became Google Cloud Vision, which reads the text off an image quickly and, more importantly, predictably. Turning that text into a field-by-field result moved into plain code, confirming the known values within the text.

The AI model didn't leave. It sits behind the same swappable reader slot as a configuration option, and as a narrow fallback: on a check that would otherwise fail, the model is consulted within the time still remaining, and it can only rescue a field, never fail one. Without a model key configured, it stays dormant and the tool runs on the text reader alone.

Two things made this change painless. The reader was built behind a swap point from the start, so replacing the default was a configuration change, not a rewrite — the rest of the system never noticed. And every result records how long its check actually took and which reader ran, so "fast enough" is something you can measure rather than assert.

## Tools

**Backend:** TypeScript on NestJS, a Postgres database through TypeORM, Docker Compose for the local setup, ESLint for both linting and formatting (Prettier was removed in favor of configurable style rules), and Jest for tests — weighted heavily toward fast tests of the pure core.

**Reading:** Google Cloud Vision for the default text reading, with Anthropic's Claude (a fast tier) reachable through the Vercel AI SDK as the configurable alternative and the fallback.

**Frontend:** a separate React 19 application using Ant Design, built with Vite and served from Firebase Hosting.

**Production:** the backend runs on Cloud Run, the database on managed Postgres (Cloud SQL), the label images in a storage bucket, deployed with a single command.

## Assumptions

Where the brief left gaps, these were the calls made, and why:

- **Regulations over preferences.** Interview requests that pulled against getting the core regulatory checks right were treated as secondary. The tool's job is to check labels against the standard.
- **All data is fake, and nothing personal is stored.** Every test application is invented. The genuinely personal fields the government form collects — the applicant's own name, phone, and email — are deliberately left off the record, because the tool doesn't need them to check a label.
- **No sign-in in the prototype.** There is nothing private to protect, so the prototype is one open space. The two roles a real version would have — the applicant who submits, and the federal reviewer who looks over results — are noted as the production direction, and the system is built so that adding them later is additive rather than a rewrite.
- **Saving runs the check.** Creating or changing an application runs its validation as part of saving, so a saved application always carries a current result, and a stored result never drifts out of date with what is on file.

## Trade-offs and limitations

Where this prototype is deliberately narrow, or genuinely weak:

- **The default reader has blind spots.** Plain text reading struggles with heavily stylized or curved lettering, and a fanciful or specialty class/type designation that matches no legal term reads as absent — a fail. The model fallback recovers some of these, but it is off unless a key is configured.
- **Some stakeholder asks were scoped out.** Batch upload of hundreds of applications at once, and automatic cleanup of poorly-shot label photos, both came up in interviews and are genuinely useful — but they were left out to spend the available time getting the core regulatory validation right. They are natural next additions, not oversights.
- **A few fields are presence-only.** Alcohol content and net contents are confirmed as present and well-formed, not matched against a stored value, because the application record doesn't carry them.
- **No integration with the existing system.** Per the IT interview, this is a standalone proof-of-concept, not wired into the agency's current COLA system.
- **The blocked-network case is documented, not built.** The agency's network blocks much outbound traffic, so a deployment inside it would likely need a reader that runs locally rather than as a cloud call. The swap point is exactly what a local reader would fill; building one was left out of scope.

## How this was built

The design was done first and recorded as it was made. Every decision above — with its reasoning and the alternatives weighed against it — is written down, and the build followed from a written specification for each phase. This page is a summary of that record; the fuller reasoning sits behind it.

## Running it

*(Exact commands live in the repository; this is the shape.)*

- **Locally:** Docker Compose brings up the whole local setup — the database and the app — with one command. For the fast coding loop, the database can be brought up on its own and the app run directly on your machine. A local configuration file holds the settings.
- **Tests:** run on demand; most are fast pure-core tests that touch neither the database nor a model.
- **Deploy:** a single command builds and updates the backend on Cloud Run and publishes the frontend to Firebase Hosting. A one-time setup checklist covers provisioning the database, the image bucket, the secret, and the hostnames.

## Related pages
- [Single-authority principle](concepts/single-authority-principle.md)
- [AI extracts, the algorithm judges](decisions/ai-extracts-algorithm-judges.md)
- [Anchored extraction](decisions/anchored-extraction.md)
- [Reader provider and the latency budget](decisions/reader-provider-and-latency.md)
- [Verification pipeline](architecture/verification-pipeline.md)
- [Validation result](interfaces/validation-result.md)
- [Tech stack](conventions/tech-stack.md)
- [Frontend stack](conventions/frontend-stack.md)
- [Production deployment](decisions/production-deployment.md)
- [Users and access (deferred)](decisions/users-and-access.md)
