import {mkdtempSync} from "fs";
import {tmpdir} from "os";
import {join} from "path";
import {DiskImageStore} from "./disk.image-store";
import {ImageNotFoundError} from "./image-store";

describe("DiskImageStore", () => {
  let store: DiskImageStore;
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fed-tht-imgs-"));
    store = new DiskImageStore(dir);
  });
  it("stores an image and fetches the same bytes back by reference", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const ref = await store.save({bytes, mediaType: "image/png"});
    const back = await store.load(ref);
    expect(Buffer.from(back.bytes)).toEqual(Buffer.from(bytes));
    expect(back.mediaType).toBe("image/png");
    expect(ref.endsWith(".png")).toBe(true);
  });
  it("creates its folder on save when it does not exist yet", async () => {
    // The store must make its own directory (the runtime needs write access to
    // it — see the Dockerfile's writable var dir for the containered app).
    const missing = join(mkdtempSync(join(tmpdir(), "fed-tht-imgs-")), "does", "not", "exist");
    const freshStore = new DiskImageStore(missing);
    const ref = await freshStore.save({bytes: new Uint8Array([9, 9, 9]), mediaType: "image/png"});
    const back = await freshStore.load(ref);
    expect(Buffer.from(back.bytes)).toEqual(Buffer.from([9, 9, 9]));
  });
  it("fails cleanly when the reference is not in the store", async () => {
    await expect(store.load("does-not-exist.png")).rejects.toBeInstanceOf(ImageNotFoundError);
  });
  it("rejects a reference that tries to escape the folder", async () => {
    await expect(store.load("../secrets.txt")).rejects.toBeInstanceOf(ImageNotFoundError);
  });
});
