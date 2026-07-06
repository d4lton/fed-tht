# Spec: Phase 6 — Storage (saving and loading applications)

## Goal

Make "load the application by its id" real: save and load the application record in the database stood up in Phase 3, and keep the label images behind a storage swap point. Until now the flow was handed its values and images by hand; after this, it reads them from saved data. No web endpoints yet — those are the next phase.

## What to build

1. **The application record in the database** — a single table holding the record from [Application record](interfaces/application-record.md): id, drink type, brand, name and address, imported-or-domestic, a reference to the images, and timestamps. Described with TypeORM (the data-access library Nest leans on), so it fits the Nest style.
2. **Save and load** — save a new record, and load one by its id. Loading is what the flow's "load the application" step calls. It stays at the edge; the core never touches it.
3. **Image storage behind a swap point** — a small slot for keeping and fetching label images: hand it an image, get back a reference; hand it a reference, get back the image. In development it is a folder on disk; in production it is Google's file storage. The record stores only the reference, and the flow and the core only ever deal with the reference — never the storage itself. Which one is in use is a config choice. See [Database and local development environment](decisions/database-and-local-environment.md).
4. **A way to seed a record for testing** — a simple helper that puts a known application (with its images) into storage, so the load step, and later the endpoints, have something real to read.

## Wiring

The flow's "load the application (by id)" step now reads the saved record and its images instead of taking hand-provided values. Everything downstream — read, combine, judge — is unchanged.

## Tests

- Save a record, load it back by id, and get the same thing.
- Loading an id that is not there fails cleanly — a clear "not found," not a crash or a wrong answer.
- The image storage slot: store an image, fetch it back by its reference, and get the same bytes. The folder-on-disk version is what runs in tests.
- With a seeded record, the whole flow (load → read → combine → judge) runs against saved data and gives the right result. Use the stand-in reader here, to keep these tests cheap and off the real model.

## Left to decide during the build

- Exactly how an image is referenced (a path, a key) and how the folder-on-disk layout looks.
- How the database table gets created and kept up to date as the record changes over time (TypeORM's migrations; the simplest safe approach for one table).
- Where the seed helper lives and how it is run.

## Not in this phase

The create-the-record, upload-images, and validation endpoints — the web surface — are the next phase. The production cloud-file-storage wiring can be a thin real implementation or a clearly-marked placeholder for now; the point is that the folder-on-disk path works and the swap point is in place.

## Related pages
- [Application record](interfaces/application-record.md)
- [Database and local development environment](decisions/database-and-local-environment.md)
- [Verification pipeline](architecture/verification-pipeline.md)
