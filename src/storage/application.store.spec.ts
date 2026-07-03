import {DataSource} from "typeorm";
import {Application} from "./application.entity";
import {ApplicationNotFoundError, ApplicationStore} from "./application.store";

/** A fresh in-memory database per test — the disk/Postgres schema stays portable. */
async function makeStore(): Promise<{ ds: DataSource; store: ApplicationStore }> {
  const ds = new DataSource({
    type: "sqljs",
    autoSave: false,
    entities: [Application],
    synchronize: true
  });
  await ds.initialize();
  return {ds, store: new ApplicationStore(ds.getRepository(Application))};
}

describe("ApplicationStore", () => {
  let ds: DataSource;
  let store: ApplicationStore;
  beforeEach(async () => {
    ({ds, store} = await makeStore());
  });
  afterEach(async () => {
    await ds.destroy();
  });
  it("saves a record and loads back the same thing by id", async () => {
    const saved = await store.save({
      drinkType: "distilled-spirits",
      brand: "Old Tom Distillery",
      nameAndAddress: "Old Tom Distillery, Bardstown, KY",
      importedOrDomestic: "domestic",
      images: [
        {label: "front", ref: "front.png"},
        {label: "back", ref: "back.png"}
      ]
    });
    expect(saved.id).toBeTruthy();
    const loaded = await store.load(saved.id);
    expect(loaded.id).toBe(saved.id);
    expect(loaded.drinkType).toBe("distilled-spirits");
    expect(loaded.brand).toBe("Old Tom Distillery");
    expect(loaded.nameAndAddress).toBe("Old Tom Distillery, Bardstown, KY");
    expect(loaded.importedOrDomestic).toBe("domestic");
    expect(loaded.images).toEqual([
      {label: "front", ref: "front.png"},
      {label: "back", ref: "back.png"}
    ]);
    expect(loaded.status).toBe("draft");
    expect(loaded.createdAt).toBeInstanceOf(Date);
  });
  it("fails cleanly when the id is not there", async () => {
    await expect(store.load("00000000-0000-0000-0000-000000000000")).rejects.toBeInstanceOf(ApplicationNotFoundError);
  });
});
