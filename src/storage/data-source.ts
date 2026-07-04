import "reflect-metadata";
import {DataSource} from "typeorm";
import {loadConfiguration} from "../config/configuration";
import {CheckRun} from "../checks/check-run.entity";
import {Application} from "./application.entity";
import {CreateApplications1730000000000} from "./migrations/1730000000000-create-applications";
import {CreateCheckRuns1730000001000} from "./migrations/1730000001000-create-check-runs";

/**
 * The TypeORM DataSource for the migration CLI (`npm run migration:run`). It
 * reads the same runtime config the app uses, so migrations run against the
 * environment's database (Compose Postgres in local dev, GCP in production).
 *
 * Config loading is async (it may fetch secrets), so this is a Promise the CLI
 * awaits — TypeORM's data-source loader awaits exported values.
 */
export default loadConfiguration().then(({app}) => new DataSource({
  type: "postgres",
  host: app.database.host,
  port: app.database.port,
  database: app.database.name,
  username: app.database.user,
  password: app.database.password,
  entities: [Application, CheckRun],
  migrations: [CreateApplications1730000000000, CreateCheckRuns1730000001000]
}));
