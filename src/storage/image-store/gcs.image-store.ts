import {randomUUID} from "crypto";
import {basename, extname} from "path";
import {Bucket, Storage} from "@google-cloud/storage";
import {ImageNotFoundError, ImageStore, StoredImage} from "./image-store";

const EXT_BY_MEDIA_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif"
};
const MEDIA_TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif"
};

/**
 * The production image store: objects in a Google Cloud Storage bucket. It fills
 * the same swap point as the disk store — hand it an image, get back a bare
 * reference (the object name); hand back the reference, get the image — so
 * nothing upstream changes between local and production. Authentication is
 * Application Default Credentials, exactly like the other Google clients.
 *
 * The `Storage` client is injectable so the ref/media-type handling can be
 * tested against a fake bucket without a live one.
 */
export class GcsImageStore implements ImageStore {

  private readonly bucket: Bucket;

  constructor(bucketName: string, storage: Storage = new Storage()) {
    this.bucket = storage.bucket(bucketName);
  }

  async save(image: StoredImage): Promise<string> {
    const ext = EXT_BY_MEDIA_TYPE[image.mediaType] ?? "bin";
    const ref = `${randomUUID()}.${ext}`;
    await this.bucket.file(ref).save(Buffer.from(image.bytes), {contentType: image.mediaType, resumable: false});
    return ref;
  }

  async load(ref: string): Promise<StoredImage> {
    // The reference is a bare object name; never let it escape into a path.
    if (ref.length === 0 || basename(ref) !== ref) {
      throw new ImageNotFoundError(ref);
    }
    let bytes: Buffer;
    try {
      [bytes] = await this.bucket.file(ref).download();
    } catch (error) {
      if (isNotFound(error)) { throw new ImageNotFoundError(ref); }
      throw error;
    }
    const ext = extname(ref).slice(1).toLowerCase();
    return {
      bytes,
      mediaType: MEDIA_TYPE_BY_EXT[ext] ?? "application/octet-stream"
    };
  }

}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as {code?: number}).code === 404;
}
