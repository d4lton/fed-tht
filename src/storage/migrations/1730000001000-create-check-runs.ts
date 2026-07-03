import {MigrationInterface, QueryRunner, Table} from "typeorm";

/** The running log of checks — one row per check run. */
export class CreateCheckRuns1730000001000 implements MigrationInterface {

  name = "CreateCheckRuns1730000001000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "check_runs",
        columns: [
          {name: "id", type: "uuid", isPrimary: true},
          {name: "applicationId", type: "uuid"},
          {name: "outcome", type: "varchar"},
          {name: "ranAt", type: "varchar"},
          {name: "tookMs", type: "int"},
          {name: "model", type: "varchar"},
          {name: "createdAt", type: "timestamp", default: "now()"}
        ]
      }),
      true
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("check_runs");
  }

}
