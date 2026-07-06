import {Storage} from "@google-cloud/storage";
import {GcsImageStore} from "./gcs.image-store";
import {ImageNotFoundError} from "./image-store";

/**
 * A tiny in-memory stand-in for the GCS client — enough of the `save` / `download`
 * surface to exercise the store's reference and media-type handling without a
 * live bucket. A missing object rejects with `{code: 404}`, as the real one does.
 */
function fakeStorage(): Storage {
  const objects = new Map<string, {data: Buffer; contentType?: string}>();
  const storage = {
    bucket() {
      return {
        file(name: string) {
          return {
            save(data: Buffer, options: {contentType?: string}) {
              objects.set(name, {data, contentType: options.contentType});
              return Promise.resolve();
            },
            download() {
              const object = objects.get(name);
              if (!object) {
                return Promise.reject(Object.assign(new Error("No such object"), {code: 404}));
              }
              return Promise.resolve([object.data]);
            }
          };
        }
      };
    }
  };
  return storage as unknown as Storage;
}

describe("GcsImageStore", () => {
  let store: GcsImageStore;
  beforeEach(() => {
    store = new GcsImageStore("fed-tht-images", fakeStorage());
  });
  it("stores an image and fetches the same bytes back by reference", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const ref = await store.save({bytes, mediaType: "image/png"});
    const back = await store.load(ref);
    expect(Buffer.from(back.bytes)).toEqual(Buffer.from(bytes));
    expect(back.mediaType).toBe("image/png");
    expect(ref.endsWith(".png")).toBe(true);
  });
  it("fails cleanly when the reference is not in the bucket", async () => {
    await expect(store.load("does-not-exist.png")).rejects.toBeInstanceOf(ImageNotFoundError);
  });
  it("rejects a reference that tries to escape into a path", async () => {
    await expect(store.load("../secrets.txt")).rejects.toBeInstanceOf(ImageNotFoundError);
  });
});
