import {Column, CreateDateColumn, Entity, PrimaryColumn} from "typeorm";
import {Outcome} from "../core";

/**
 * One entry per check run — the running log of checks. The result on an
 * application answers "how did this one do"; this log answers "how is the tool
 * performing across many runs," which is the evidence for the speed requirement.
 */
@Entity({name: "check_runs"})
export class CheckRun {

  @PrimaryColumn("uuid")
    id!: string;

  @Column({type: "uuid"})
    applicationId!: string;

  @Column({type: "varchar"})
    outcome!: Outcome;

  /** When the check ran (ISO 8601). */
  @Column({type: "varchar"})
    ranAt!: string;

  /** How long the whole check took, in milliseconds. */
  @Column({type: "int"})
    tookMs!: number;

  /** Which model/reader read the images. */
  @Column({type: "varchar"})
    model!: string;

  @CreateDateColumn()
    createdAt!: Date;

}
