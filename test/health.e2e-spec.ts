import { Server } from "http";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("Health (e2e)", () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it("GET /health returns ok and reports database reachability", async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server).get("/health").expect(200);
    const body = res.body as {
      status: string;
      database?: { reachable?: unknown };
    };
    expect(body).toMatchObject({ status: "ok" });
    // Reachability is reported as a boolean either way; its value depends on
    // whether the Compose database happens to be up during the test run.
    expect(typeof body.database?.reachable).toBe("boolean");
  });
});
