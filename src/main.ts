import {NestFactory} from "@nestjs/core";
import {AppModule} from "./app.module";
import {AppConfigService} from "./config/app-config.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  // The frontend is a separate app at its own address; allow it to call the API.
  app.enableCors({origin: config.cors.origins});
  await app.listen(config.port);
}

void bootstrap();
