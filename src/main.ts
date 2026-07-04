import {NestFactory} from "@nestjs/core";
import {NestExpressApplication} from "@nestjs/platform-express";
import {AppModule} from "./app.module";
import {AppConfigService} from "./config/app-config.service";
import {configureBodyParser} from "./http-config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {bodyParser: false});
  configureBodyParser(app);
  const config = app.get(AppConfigService);
  // The frontend is a separate app at its own address; allow it to call the API.
  app.enableCors({origin: config.cors.origins});
  await app.listen(config.port);
}

void bootstrap();
