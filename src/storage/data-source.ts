import "reflect-metadata";
import { DataSource } from "typeorm";
import { loadConfiguration } from "../config/configuration";
import { Application } from "./application.entity";
import { CreateApplications1730000000000 } from "./migrations/1730000000000-create-applications";

/**
 * The TypeORM DataSource for the migration CLI (`npm run migration:run`). It
 * reads the same runtime config the app uses, so migrations run against the
 * environment's database (Compose Postgres in local dev, GCP in production).
 */
const { app } = loadConfiguration();

export default new DataSource({
  type: "postgres",
  host: app.database.host,
  port: app.database.port,
  database: app.database.name,
  username: app.database.user,
  password: app.database.password,
  entities: [Application],
  migrations: [CreateApplications1730000000000]
});
