import {MigrationInterface, QueryRunner, TableColumn} from "typeorm";

/**
 * Records whether the model fallback was consulted on a run. Backfills as
 * `false` — existing rows predate the flag, and a plain OCR run is the default.
 */
export class AddCheckRunAssisted1730000002000 implements MigrationInterface {

  name = "AddCheckRunAssisted1730000002000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "check_runs",
      new TableColumn({name: "assisted", type: "boolean", default: false})
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("check_runs", "assisted");
  }

}
