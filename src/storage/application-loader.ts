import {Inject, Injectable} from "@nestjs/common";
import {DrinkType, ExpectedValues} from "../core";
import {LabelImage} from "../reader";
import {ApplicationStore} from "./application.store";
import {IMAGE_STORE, ImageStore} from "./image-store/image-store";

/**
 * What the pipeline's "load the application" step hands downstream: the clean
 * inputs the rest of the flow wants, with the images already resolved to bytes.
 * Nothing downstream needs to know how the record or images are stored.
 */
export interface LoadedApplication {
  application: string;
  type: DrinkType;
  expected: ExpectedValues;
  images: LabelImage[];
}

/**
 * Pipeline step 1 — load the application by id. Reads the stored record and
 * resolves each image reference to bytes through the storage swap point, so the
 * flow deals only in references (never the storage itself) and the reader is
 * handed ready image bytes.
 */
@Injectable()
export class ApplicationLoader {

  constructor(
    private readonly applications: ApplicationStore,
    @Inject(IMAGE_STORE) private readonly images: ImageStore
  ) {}

  async load(id: string): Promise<LoadedApplication> {
    const record = await this.applications.load(id);
    const images: LabelImage[] = await Promise.all(
      record.images.map(async (image) => {
        const stored = await this.images.load(image.ref);
        return {
          label: image.label,
          data: stored.bytes,
          mediaType: stored.mediaType
        };
      })
    );
    return {
      application: record.id,
      type: record.drinkType,
      expected: {
        brand: record.brand,
        nameAndAddress: record.nameAndAddress,
        importedOrDomestic: record.importedOrDomestic
      },
      images
    };
  }

}
