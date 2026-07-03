/**
 * The image storage swap point. Hand it an image, get back a reference; hand it
 * a reference, get back the image. In development that's a folder on disk; in
 * production it's Google's file storage. The application record stores only the
 * reference, and the flow and the core only ever deal with the reference —
 * never the storage itself. Which implementation is in use is a config choice.
 */
export interface ImageStore {
  /** Store an image; get back an opaque reference to it. */
  save(image: StoredImage): Promise<string>;
  /** Fetch an image back by its reference. */
  load(ref: string): Promise<StoredImage>;
}

export interface StoredImage {
  bytes: Uint8Array;
  /** e.g. "image/png". */
  mediaType: string;
}

/** DI token for the configured {@link ImageStore}. */
export const IMAGE_STORE = Symbol("IMAGE_STORE");

/** Fetching a reference that isn't in the store — a clear miss, not a crash. */
export class ImageNotFoundError extends Error {

  constructor(readonly ref: string) {
    super(`image "${ref}" not found`);
    this.name = "ImageNotFoundError";
  }

}
