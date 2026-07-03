import {randomUUID} from "crypto";
import {mkdir, readFile, writeFile} from "fs/promises";
import {basename, extname, join} from "path";
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
 * The development image store: images are files under a folder, and the
 * reference is the file name. This is what runs in tests.
 */
export class DiskImageStore implements ImageStore {

  constructor(private readonly dir: string) {}

  async save(image: StoredImage): Promise<string> {
    await mkdir(this.dir, {recursive: true});
    const ext = EXT_BY_MEDIA_TYPE[image.mediaType] ?? "bin";
    const ref = `${randomUUID()}.${ext}`;
    await writeFile(join(this.dir, ref), image.bytes);
    return ref;
  }

  async load(ref: string): Promise<StoredImage> {
    // The reference is a bare file name; never let it escape the folder.
    if (ref.length === 0 || basename(ref) !== ref) {
      throw new ImageNotFoundError(ref);
    }
    let bytes: Buffer;
    try {
      bytes = await readFile(join(this.dir, ref));
    } catch (error) {
      if (isNotFound(error)) {
        throw new ImageNotFoundError(ref);
      }
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
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "ENOENT";
}
