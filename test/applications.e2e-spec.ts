import {Server} from "http";
import {INestApplication} from "@nestjs/common";
import {Test, TestingModule} from "@nestjs/testing";
import request from "supertest";
import {AppModule} from "../src/app.module";
import {DrinkType, LabelReadingReport} from "../src/core";
import {LABEL_READER, LabelImage, LabelReader} from "../src/reader";
import {GOVERNMENT_WARNING_TEXT} from "../src/core/validate/__fixtures__/spirits-rules.fixture";

/** A stand-in reader whose reads are set per test, keyed by label. */
class FakeReader implements LabelReader {

  readonly model = "stand-in";
  private reads = new Map<string, LabelReadingReport>();

  setReads(reports: LabelReadingReport[]): void {
    this.reads = new Map(reports.map((report) => [report.label, report]));
  }

  read(image: LabelImage): Promise<LabelReadingReport> {
    return Promise.resolve(this.reads.get(image.label) ?? {label: image.label, fields: []});
  }

}

const CLEAN_READS: LabelReadingReport[] = [
  {
    label: "front",
    fields: [
      {field: "brand", state: "found", text: "Old Tom Distillery", basis: "confirmed"},
      {
        field: "name-and-address",
        state: "found",
        text: "Bottled by Old Tom Distillery, Bardstown, KY",
        basis: "confirmed"
      },
      {field: "alcohol", state: "found", text: "45% Alc./Vol.", basis: "confirmed"},
      {field: "net-contents", state: "found", text: "750 mL", basis: "confirmed"},
      {
        field: "class-type",
        state: "found",
        text: "Kentucky Straight Bourbon Whiskey",
        basis: "confirmed"
      }
    ]
  },
  {
    label: "back",
    fields: [{field: "warning", state: "found", text: GOVERNMENT_WARNING_TEXT, basis: "confirmed"}]
  }
];
const pngBase64 = Buffer.from([1, 2, 3, 4]).toString("base64");

interface ResultBody {
  outcome: "pass" | "fail";
  reasons: { id: string }[];
  ranAt: string;
  tookMs: number;
  model: string;
}
interface ApplicationBody {
  id: string;
  drinkType: DrinkType;
  brand: string;
  images: { label: string; ref: string }[];
  result: ResultBody | null;
}

describe("Applications (e2e)", () => {
  let app: INestApplication;
  let server: Server;
  const reader = new FakeReader();
  let id: string;
  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(LABEL_READER)
      .useValue(reader)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });
  afterAll(async () => {
    await app.close();
  });
  it("creates an application and runs the check as part of saving (no images yet → a failing result, still a successful save)", async () => {
    const res = await request(server)
      .post("/applications")
      .send({
        drinkType: "distilled-spirits",
        brand: "Old Tom Distillery",
        nameAndAddress: "Old Tom Distillery, Bardstown, KY",
        importedOrDomestic: "domestic"
      })
      .expect(201);
    const body = res.body as ApplicationBody;
    id = body.id;
    expect(body.id).toBeTruthy();
    expect(body.result).not.toBeNull();
    expect(body.result?.outcome).toBe("fail");
    expect(body.result?.model).toBe("stand-in");
    expect(typeof body.result?.tookMs).toBe("number");
    expect(body.result?.reasons.map((reason) => reason.id)).toContain("brand-missing");
  });
  it("lists the created applications with their statuses", async () => {
    const res = await request(server).get("/applications").expect(200);
    const rows = res.body as { id: string; outcome: string | null }[];
    const row = rows.find((candidate) => candidate.id === id);
    expect(row).toBeDefined();
    expect(row?.outcome).toBe("fail");
  });
  it("changing the images re-runs the check and replaces the result (fail → pass)", async () => {
    reader.setReads(CLEAN_READS);
    const res = await request(server)
      .put(`/applications/${id}/images`)
      .send({
        images: [
          {label: "front", data: pngBase64, mediaType: "image/png"},
          {label: "back", data: pngBase64, mediaType: "image/png"}
        ]
      })
      .expect(200);
    const body = res.body as ApplicationBody;
    expect(body.result?.outcome).toBe("pass");
    expect(body.result?.reasons).toEqual([]);
    expect(body.images.map((i) => i.label).sort()).toEqual(["back", "front"]);
  });
  it("returns everything on file for one application: its fields, images, and result", async () => {
    const res = await request(server).get(`/applications/${id}`).expect(200);
    const body = res.body as ApplicationBody;
    expect(body.brand).toBe("Old Tom Distillery");
    expect(body.images).toHaveLength(2);
    expect(body.result?.outcome).toBe("pass");
  });
  it("serves a label image's bytes", async () => {
    const res = await request(server).get(`/applications/${id}/images/front`).buffer(true).expect(200);
    expect(res.headers["content-type"]).toContain("image/png");
    expect(Buffer.from(res.body as Buffer)).toEqual(Buffer.from([1, 2, 3, 4]));
  });
  it("returns 404 for a missing image label", async () => {
    await request(server).get(`/applications/${id}/images/neck`).expect(404);
  });
  it("returns 404 for an application that is not there", async () => {
    await request(server).get("/applications/00000000-0000-0000-0000-000000000000").expect(404);
  });
  it("serves the reason code-to-text list", async () => {
    const res = await request(server).get("/reason-texts").expect(200);
    const texts = res.body as Record<string, string>;
    expect(typeof texts["warning-missing"]).toBe("string");
    expect(typeof texts["brand-wrong"]).toBe("string");
  });
});
