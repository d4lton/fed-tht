import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { DrinkType, OriginStatus } from "../core";

/** One label image on the record: which label, and its reference in the store. */
export interface ImageRef {
  /** front / back / neck. */
  label: string;
  /** Reference into the {@link ImageStore}. */
  ref: string;
}

export type ApplicationStatus = "draft" | "ready";

/**
 * The stored application record (see the Application Record design page): the
 * few things the checker needs, plus references to the images and bookkeeping.
 * This lives at the outer edge — the pure core never touches it.
 *
 * Column types are kept portable (varchar + simple-json) so the same entity
 * works against Postgres in the real app and an in-memory database in tests.
 */
@Entity({ name: "applications" })
export class Application {
  /** How every other part of the system refers to this application. */
  @PrimaryColumn("uuid")
  id!: string;

  /** Picks which rule set applies during validation. */
  @Column({ type: "varchar" })
  drinkType!: DrinkType;

  /** A value we look for on the label and compare against. */
  @Column({ type: "varchar" })
  brand!: string;

  /** The producer/bottler's name and address, compared against the label. */
  @Column({ type: "varchar" })
  nameAndAddress!: string;

  /** A stored fact that switches the country-of-origin rule on or off. */
  @Column({ type: "varchar" })
  importedOrDomestic!: OriginStatus;

  /** References to the label images (front/back/neck); loaded by reference. */
  @Column({ type: "simple-json" })
  images!: ImageRef[];

  @Column({ type: "varchar", default: "draft" })
  status!: ApplicationStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
