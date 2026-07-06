# Decision: Users and Access (deferred)

## The decision

The prototype has no sign-in and no user roles. Everyone who opens it sees one shared, open space — the same applications, the same actions. Nothing tells one kind of person from another.

## Why deferred

The brief treated security and stored personal data as production concerns, not prototype ones, and there is nothing private in the system anyway — every application is made-up test data (see [Application record](interfaces/application-record.md)). So sign-in has little to protect here, and building it would spend time the prototype needs elsewhere.

## The two roles a real version would have

A production version would separate two kinds of person:

- the **applicant**, who submits an application and its label images for approval, and
- the **reviewer** (a federal employee), who looks over the list of applications and their results and makes the call.

These are genuinely different jobs on the same data, and a real version would show each only what their job needs. Naming them keeps the design honest about where it is headed.

## Don't design against them

We build no roles now, but we do not build in a way that makes adding them later a rewrite. In particular:

- The endpoints are the natural place a "who are you, and what may you do" check would later sit — in front of them — so they stay clean enough to wrap.
- The application record could later gain an owner (which applicant it belongs to) without disturbing what is there.

We do not build either of these now; we just avoid choices that would fight them later — for example, assuming a single anonymous user so deeply that separating users would mean unpicking it.

## Related pages
- [Application record](interfaces/application-record.md)
- [Verification pipeline](architecture/verification-pipeline.md)
