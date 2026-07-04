import {NestExpressApplication} from "@nestjs/platform-express";

/**
 * Label images arrive base64-encoded in the request body — all of an
 * application's labels in one call — so the framework's default 100kb JSON limit
 * is far too small: a single real photo blows past it. Raise it enough for a few
 * images. Shared by bootstrap and the e2e app so tests exercise the real limit.
 */
export const BODY_LIMIT = "15mb";

export function configureBodyParser(app: NestExpressApplication): void {
  app.useBodyParser("json", {limit: BODY_LIMIT});
  app.useBodyParser("urlencoded", {limit: BODY_LIMIT, extended: true});
}
