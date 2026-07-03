import {DrinkType, Outcome, OriginStatus} from "../core";
import {CheckResult} from "../checks/check-result";
import {Application, ApplicationStatus, ImageRef} from "../storage/application.entity";

/** One row for the list — the fields worth showing at a glance, plus status. */
export interface ApplicationSummary {
  id: string;
  drinkType: DrinkType;
  brand: string;
  importedOrDomestic: OriginStatus;
  /** The last result's outcome (null only for a record with no result yet). */
  outcome: Outcome | null;
  ranAt: string | null;
}

/** Everything on file for one application. */
export interface ApplicationView {
  id: string;
  drinkType: DrinkType;
  brand: string;
  nameAndAddress: string;
  importedOrDomestic: OriginStatus;
  status: ApplicationStatus;
  images: ImageRef[];
  result: CheckResult | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toSummary(record: Application): ApplicationSummary {
  return {
    id: record.id,
    drinkType: record.drinkType,
    brand: record.brand,
    importedOrDomestic: record.importedOrDomestic,
    outcome: record.result?.outcome ?? null,
    ranAt: record.result?.ranAt ?? null
  };
}

export function toView(record: Application): ApplicationView {
  return {
    id: record.id,
    drinkType: record.drinkType,
    brand: record.brand,
    nameAndAddress: record.nameAndAddress,
    importedOrDomestic: record.importedOrDomestic,
    status: record.status,
    images: record.images,
    result: record.result,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}
