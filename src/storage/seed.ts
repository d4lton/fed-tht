import { DrinkType, OriginStatus } from "../core";
import { ApplicationStore } from "./application.store";
import { ImageStore, StoredImage } from "./image-store/image-store";

export interface SeedImage {
  /** front / back / neck. */
  label: string;
  image: StoredImage;
}

export interface SeedApplication {
  drinkType: DrinkType;
  brand: string;
  nameAndAddress: string;
  importedOrDomestic: OriginStatus;
  images: SeedImage[];
}

/**
 * Put a known application — with its images — into storage, so the load step
 * (and later the endpoints) have something real to read. Returns the new id.
 * The images go through the same swap point everything else uses.
 */
export async function seedApplication(applications: ApplicationStore, imageStore: ImageStore, input: SeedApplication): Promise<string> {
  const images = await Promise.all(
    input.images.map(async (entry) => ({
      label: entry.label,
      ref: await imageStore.save(entry.image)
    }))
  );
  const record = await applications.save({
    drinkType: input.drinkType,
    brand: input.brand,
    nameAndAddress: input.nameAndAddress,
    importedOrDomestic: input.importedOrDomestic,
    images,
    status: "ready"
  });
  return record.id;
}
