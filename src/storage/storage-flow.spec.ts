import {mkdtempSync} from "fs";
import {tmpdir} from "os";
import {join} from "path";
import {DataSource} from "typeorm";
import {LabelReadingReport} from "../core";
import {GOVERNMENT_WARNING_TEXT} from "../core/validate/__fixtures__/spirits-rules.fixture";
import {verifyLabels} from "../pipeline/verify";
import {StandInReader} from "../reader";
import {loadSpiritsRules} from "../rules/rules-loader";
import {Application} from "./application.entity";
import {ApplicationLoader} from "./application-loader";
import {ApplicationStore} from "./application.store";
import {DiskImageStore} from "./image-store/disk.image-store";
import {seedApplication} from "./seed";

const rules = loadSpiritsRules();

interface Env {
  ds: DataSource;
  store: ApplicationStore;
  imageStore: DiskImageStore;
  loader: ApplicationLoader;
}

async function makeEnv(): Promise<Env> {
  const ds = new DataSource({
    type: "sqljs",
    autoSave: false,
    entities: [Application],
    synchronize: true
  });
  await ds.initialize();
  const store = new ApplicationStore(ds.getRepository(Application));
  const imageStore = new DiskImageStore(mkdtempSync(join(tmpdir(), "fed-tht-flow-")));
  return {ds, store, imageStore, loader: new ApplicationLoader(store, imageStore)};
}

/** Seed a bourbon record with a front and a back image (bytes are placeholders). */
function seed(env: Env): Promise<string> {
  return seedApplication(env.store, env.imageStore, {
    drinkType: "distilled-spirits",
    brand: "Old Tom Distillery",
    nameAndAddress: "Old Tom Distillery, Bardstown, KY",
    importedOrDomestic: "domestic",
    images: [
      {label: "front", image: {bytes: new Uint8Array([1, 2, 3]), mediaType: "image/png"}},
      {label: "back", image: {bytes: new Uint8Array([4, 5, 6]), mediaType: "image/png"}}
    ]
  });
}

function cleanReads(): LabelReadingReport[] {
  return [
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
}

function mangledReads(): LabelReadingReport[] {
  const reads = cleanReads();
  // Wrong brand on the front, and no warning anywhere.
  reads[0].fields[0] = {field: "brand", state: "found", text: "Totally Different", basis: "confirmed"};
  reads[1].fields = [];
  return reads;
}

describe("storage flow — load (from saved data) → read → combine → judge", () => {
  let env: Env;
  beforeEach(async () => {
    env = await makeEnv();
  });
  afterEach(async () => {
    await env.ds.destroy();
  });
  it("passes for a clean bourbon read against the seeded record", async () => {
    const id = await seed(env);
    const loaded = await env.loader.load(id);
    // The load step resolved the image references to bytes through the store.
    expect(loaded.application).toBe(id);
    expect(loaded.images.map((i) => i.label).sort()).toEqual(["back", "front"]);
    expect(loaded.images[0].data).toBeInstanceOf(Uint8Array);
    const result = await verifyLabels({
      images: loaded.images,
      type: loaded.type,
      expected: loaded.expected,
      rules,
      reader: new StandInReader(cleanReads()),
      application: loaded.application
    });
    expect(result.outcome).toBe("pass");
    expect(result.application).toBe(id);
  });
  it("fails with the right reasons for a mangled read against the seeded record", async () => {
    const id = await seed(env);
    const loaded = await env.loader.load(id);
    const result = await verifyLabels({
      images: loaded.images,
      type: loaded.type,
      expected: loaded.expected,
      rules,
      reader: new StandInReader(mangledReads()),
      application: loaded.application
    });
    expect(result.outcome).toBe("fail");
    const ids = result.reasons.map((reason) => reason.id);
    expect(ids).toContain("brand-wrong");
    expect(ids).toContain("warning-missing");
  });
});
