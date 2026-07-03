import {LabelReadingReport} from "../core";
import {StandInReader} from "./stand-in.reader";

const FRONT: LabelReadingReport = {
  label: "front",
  fields: [{field: "brand", state: "found", text: "Old Tom", basis: "confirmed"}]
};
const BACK: LabelReadingReport = {
  label: "back",
  fields: [{field: "warning", state: "found", text: "GOVERNMENT WARNING: ..."}]
};
describe("StandInReader", () => {
  it("returns the pre-set read matching the image label", async () => {
    const reader = new StandInReader([FRONT, BACK]);
    await expect(reader.read({label: "front"})).resolves.toBe(FRONT);
    await expect(reader.read({label: "back"})).resolves.toBe(BACK);
  });
  it("rejects when it has no pre-set read for a label", async () => {
    const reader = new StandInReader([FRONT]);
    await expect(reader.read({label: "neck"})).rejects.toThrow(/no pre-set read/);
  });
  it("ignores the image source and still returns its pre-set read", async () => {
    const reader = new StandInReader([FRONT]);
    await expect(reader.read({label: "front", source: "anything.png"})).resolves.toBe(FRONT);
  });
});
