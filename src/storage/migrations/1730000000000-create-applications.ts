import {MigrationInterface, QueryRunner, Table} from "typeorm";

/**
 * The one table for the application record. Kept as a migration (rather than
 * schema auto-sync) so the real Postgres schema changes safely and on purpose.
 * Tests use an in-memory database with auto-sync instead, so they don't run this.
 */
export class CreateApplications1730000000000 implements MigrationInterface {

  name = "CreateApplications1730000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "applications",
        columns: [
          {name: "id", type: "uuid", isPrimary: true},
          {name: "drinkType", type: "varchar"},
          {name: "brand", type: "varchar"},
          {name: "nameAndAddress", type: "varchar"},
          {name: "importedOrDomestic", type: "varchar"},
          {name: "images", type: "text"},
          {name: "status", type: "varchar", default: "'draft'"},
          {name: "result", type: "text", isNullable: true},
          {name: "createdAt", type: "timestamp", default: "now()"},
          {name: "updatedAt", type: "timestamp", default: "now()"}
        ]
      }),
      true
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("applications");
  }

}
