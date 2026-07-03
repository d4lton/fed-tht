import {randomUUID} from "crypto";
import {Injectable} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {DrinkType, OriginStatus} from "../core";
import {Application, ApplicationStatus, ImageRef} from "./application.entity";

/** Loading an id that isn't there — a clear "not found," not a crash. */
export class ApplicationNotFoundError extends Error {

  constructor(readonly id: string) {
    super(`application "${id}" not found`);
    this.name = "ApplicationNotFoundError";
  }

}

/** The fields needed to save a new application; id and timestamps are assigned. */
export interface NewApplication {
  drinkType: DrinkType;
  brand: string;
  nameAndAddress: string;
  importedOrDomestic: OriginStatus;
  images: ImageRef[];
  status?: ApplicationStatus;
}

/**
 * Save and load application records. This is the storage edge the pipeline's
 * "load the application (by id)" step is built on; the core never sees it.
 */
@Injectable()
export class ApplicationStore {

  constructor(
    @InjectRepository(Application)
    private readonly repo: Repository<Application>
  ) {}

  async save(input: NewApplication): Promise<Application> {
    const record = this.repo.create({
      id: randomUUID(),
      status: "draft",
      ...input
    });
    return this.repo.save(record);
  }

  async load(id: string): Promise<Application> {
    const record = await this.repo.findOne({where: {id}});
    if (!record) {
      throw new ApplicationNotFoundError(id);
    }
    return record;
  }

  /** Persist changes to an already-loaded record. */
  async update(record: Application): Promise<Application> {
    return this.repo.save(record);
  }

  /** All applications, newest first. */
  list(): Promise<Application[]> {
    return this.repo.find({order: {createdAt: "DESC"}});
  }

}
