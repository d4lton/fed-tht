import {Inject, Injectable} from "@nestjs/common";
import {CheckService} from "../checks/check.service";
import {Application, ImageRef} from "../storage/application.entity";
import {ApplicationStore} from "../storage/application.store";
import {IMAGE_STORE, ImageStore} from "../storage/image-store/image-store";
import {CreateApplicationDto, UpdateDetailsDto, UpdateImagesDto} from "./application.dto";
import {ApplicationSummary, ApplicationView, toSummary, toView} from "./application-view";

/**
 * The application record's web operations. Every save (create, detail change,
 * image change) runs the check as part of saving, so a saved application always
 * carries a current result. A failed check is still a successful save.
 *
 * The controller stays thin; this holds the orchestration. No user/ownership is
 * assumed, so a "who are you, what may you do" check can later sit in front of
 * these without unpicking anything here.
 */
@Injectable()
export class ApplicationsService {

  constructor(
    private readonly store: ApplicationStore,
    @Inject(IMAGE_STORE) private readonly imageStore: ImageStore,
    private readonly checks: CheckService
  ) {}

  async create(dto: CreateApplicationDto): Promise<ApplicationView> {
    const record = await this.store.save({
      drinkType: dto.drinkType,
      brand: dto.brand,
      nameAndAddress: dto.nameAndAddress,
      importedOrDomestic: dto.importedOrDomestic,
      images: []
    });
    return this.checkAndSave(record);
  }

  async list(): Promise<ApplicationSummary[]> {
    const records = await this.store.list();
    return records.map(toSummary);
  }

  async get(id: string): Promise<ApplicationView> {
    return toView(await this.store.load(id));
  }

  async updateDetails(id: string, dto: UpdateDetailsDto): Promise<ApplicationView> {
    const record = await this.store.load(id);
    if (dto.drinkType !== undefined) {
      record.drinkType = dto.drinkType;
    }
    if (dto.brand !== undefined) {
      record.brand = dto.brand;
    }
    if (dto.nameAndAddress !== undefined) {
      record.nameAndAddress = dto.nameAndAddress;
    }
    if (dto.importedOrDomestic !== undefined) {
      record.importedOrDomestic = dto.importedOrDomestic;
    }
    return this.checkAndSave(record);
  }

  async updateImages(id: string, dto: UpdateImagesDto): Promise<ApplicationView> {
    const record = await this.store.load(id);
    const images: ImageRef[] = await Promise.all(
      dto.images.map(async (image) => ({
        label: image.label,
        ref: await this.imageStore.save({
          bytes: Buffer.from(image.data, "base64"),
          mediaType: image.mediaType
        })
      }))
    );
    record.images = images;
    return this.checkAndSave(record);
  }

  /** Run the check on the record (part of saving) and persist it with the result. */
  private async checkAndSave(record: Application): Promise<ApplicationView> {
    record.result = await this.checks.run({
      application: record.id,
      type: record.drinkType,
      brand: record.brand,
      nameAndAddress: record.nameAndAddress,
      importedOrDomestic: record.importedOrDomestic,
      images: record.images
    });
    return toView(await this.store.update(record));
  }

}
