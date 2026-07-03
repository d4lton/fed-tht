import { ImageStore, StoredImage } from "./image-store";

/**
 * The production image store: Google Cloud Storage.
 *
 * PLACEHOLDER — clearly marked. The real implementation will keep and fetch
 * objects in a GCS bucket (via `@google-cloud/storage`). For this phase only
 * the folder-on-disk path needs to work; the point is that the swap point is in
 * place, so wiring this in later changes nothing above it.
 */
export class GcsImageStore implements ImageStore {
  constructor(private readonly bucket: string) {}

  save(): Promise<string> {
    return Promise.reject(this.notImplemented());
  }

  load(): Promise<StoredImage> {
    return Promise.reject(this.notImplemented());
  }

  private notImplemented(): Error {
    return new Error(`GcsImageStore (bucket "${this.bucket}") is a placeholder; wire @google-cloud/storage for production`);
  }
}
