import {DrinkType, ExpectedValues, LabelReadingReport} from "../core";
import {GOVERNMENT_WARNING_TEXT, makeSpiritsRules} from "../core/validate/__fixtures__/spirits-rules.fixture";
import {LabelImage, LabelReader, StandInReader, ThingsToLookFor} from "../reader";
import {thingsToLookFor, verifyLabels} from "./verify";

const TYPE: DrinkType = "distilled-spirits";
const RULES = makeSpiritsRules();
const EXPECTED: ExpectedValues = {
  brand: "Old Tom Distillery",
  nameAndAddress: "Old Tom Distillery, Bardstown, KY",
  importedOrDomestic: "domestic"
};
const IMAGES: LabelImage[] = [{label: "front"}, {label: "back"}];

// --- scenario reads (hand-written, no images) -----------------------------

function cleanBourbon(): LabelReadingReport[] {
  return [
    {
      label: "front",
      fields: [
        {
          field: "brand",
          state: "found",
          text: "Old Tom Distillery",
          basis: "confirmed"
        },
        {
          field: "name-and-address",
          state: "found",
          text: "Bottled by Old Tom Distillery, Bardstown, KY",
          basis: "confirmed"
        },
        {
          field: "alcohol",
          state: "found",
          text: "45% Alc./Vol. (90 Proof)",
          basis: "confirmed"
        },
        {
          field: "net-contents",
          state: "found",
          text: "750 mL",
          basis: "confirmed"
        },
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
      fields: [
        {
          field: "warning",
          state: "found",
          text: GOVERNMENT_WARNING_TEXT,
          basis: "confirmed"
        }
      ]
    }
  ];
}

/**
 * A mangled set with three distinct problems: a missing warning, a wrong brand,
 * and two labels disagreeing (45% vs 40% alcohol).
 */
function mangledBourbon(): LabelReadingReport[] {
  return [
    {
      label: "front",
      fields: [
        {
          field: "brand",
          state: "found",
          text: "Definitely Not Old Tom",
          basis: "confirmed"
        },
        {
          field: "name-and-address",
          state: "found",
          text: "Bottled by Old Tom Distillery, Bardstown, KY",
          basis: "confirmed"
        },
        {
          field: "alcohol",
          state: "found",
          text: "45% Alc./Vol. (90 Proof)",
          basis: "confirmed"
        },
        {
          field: "net-contents",
          state: "found",
          text: "750 mL",
          basis: "confirmed"
        },
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
      // Warning is absent everywhere; alcohol disagrees with the front.
      fields: [
        {
          field: "alcohol",
          state: "found",
          text: "40% Alc./Vol. (80 Proof)",
          basis: "confirmed"
        }
      ]
    }
  ];
}

function run(reader: LabelReader) {
  return verifyLabels({
    images: IMAGES,
    type: TYPE,
    expected: EXPECTED,
    rules: RULES,
    reader
  });
}

// --- the flow, end to end through the slot --------------------------------

describe("verifyLabels — read → combine → judge through the reader slot", () => {
  it("passes for a clean bourbon (front + back)", async () => {
    const result = await run(new StandInReader(cleanBourbon()));
    expect(result.outcome).toBe("pass");
    expect(result.reasons).toEqual([]);
  });
  it("fails a mangled set, carrying the right reasons", async () => {
    const result = await run(new StandInReader(mangledBourbon()));
    expect(result.outcome).toBe("fail");
    expect(result.reasons.map((reason) => reason.id).sort()).toEqual(["alcohol-conflict", "brand-wrong", "warning-missing"].sort());
  });
  it("swapping the reader is all that changes", async () => {
    // Same images/type/expected/rules; only the reader differs.
    const clean = await run(new StandInReader(cleanBourbon()));
    const mangled = await run(new StandInReader(mangledBourbon()));
    expect(clean.outcome).toBe("pass");
    expect(mangled.outcome).toBe("fail");
  });
  it("reads through the slot: once per image, handed the things to look for", async () => {
    const recorder = new RecordingReader(cleanBourbon());
    await run(recorder);
    expect(recorder.calls.map((call) => call.image.label)).toEqual(["front", "back"]);
    for (const call of recorder.calls) {
      expect(call.type).toBe(TYPE);
      expect(call.lookFor.brand).toBe(EXPECTED.brand);
      expect(call.lookFor.nameAndAddress).toBe(EXPECTED.nameAndAddress);
      expect(call.lookFor.warning?.text).toBe(GOVERNMENT_WARNING_TEXT);
      expect(call.lookFor.designations.length).toBeGreaterThan(0);
    }
  });
});
describe("thingsToLookFor", () => {
  it("pulls the warning wording and designations from the rules", () => {
    const lookFor = thingsToLookFor(EXPECTED, RULES);
    expect(lookFor.brand).toBe(EXPECTED.brand);
    expect(lookFor.warning?.capsWords).toContain("GOVERNMENT WARNING");
    expect(lookFor.designations.some((designation) => designation.designation === "Bourbon Whiskey")).toBe(true);
  });
});

/** A reader that records how the slot was called, for the wiring assertions. */
class RecordingReader implements LabelReader {

  readonly model = "recording";
  readonly calls: Array<{
    image: LabelImage;
    type: DrinkType;
    lookFor: ThingsToLookFor;
  }> = [];
  private readonly reports: Map<string, LabelReadingReport>;

  constructor(reports: LabelReadingReport[]) {
    this.reports = new Map(reports.map((report) => [report.label, report]));
  }

  read(image: LabelImage, type: DrinkType, lookFor: ThingsToLookFor): Promise<LabelReadingReport> {
    this.calls.push({image, type, lookFor});
    const report = this.reports.get(image.label);
    if (!report) {
      return Promise.reject(new Error(`no read for ${image.label}`));
    }
    return Promise.resolve(report);
  }

}
