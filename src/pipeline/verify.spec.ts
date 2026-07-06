import {DrinkType, ExpectedValues, FieldRead, LabelReadingReport} from "../core";
import {GOVERNMENT_WARNING_TEXT, makeSpiritsRules} from "../core/validate/__fixtures__/spirits-rules.fixture";
import {LabelImage, LabelReader, LlmFallback, RecheckInput, RereadInput, StandInReader, ThingsToLookFor} from "../reader";
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
// --- the deterministic-first fallback -------------------------------------

/** A fake fallback: records what it was asked, returns pre-set reads per move. */
class FakeFallback implements LlmFallback {

  lastRecheck?: RecheckInput;
  lastReread?: RereadInput;

  constructor(
    private readonly recheckReads: FieldRead[] = [],
    private readonly rereadReads: FieldRead[] = []
  ) {}

  recheck(input: RecheckInput): Promise<FieldRead[]> {
    this.lastRecheck = input;
    return Promise.resolve(this.recheckReads);
  }

  reread(input: RereadInput): Promise<FieldRead[]> {
    this.lastReread = input;
    return Promise.resolve(this.rereadReads);
  }

}

/** A clean bourbon, but the fast pass missed net-contents; the OCR text has it. */
function missedNetContents(): LabelReadingReport[] {
  const reports = cleanBourbon();
  reports[0].fields = reports[0].fields.filter((read) => read.field !== "net-contents");
  reports[0].sourceText = "OLD TOM DISTILLERY\nKentucky Straight Bourbon Whiskey\n45% Alc./Vol.\nONE PINT NINE OUNCES";
  reports[1].sourceText = GOVERNMENT_WARNING_TEXT;
  return reports;
}

/** A clean bourbon, but the fast pass read the warning too poorly to judge. */
function mangledWarning(): LabelReadingReport[] {
  const reports = cleanBourbon();
  const mangled = GOVERNMENT_WARNING_TEXT.replace("your ability", "yourability").replace("health problems", "healthproblem");
  reports[1].fields = [{field: "warning", state: "found", text: mangled, basis: "confirmed"}];
  return reports;
}

function runWith(reader: LabelReader, fallback: LlmFallback) {
  return verifyLabels({images: IMAGES, type: TYPE, expected: EXPECTED, rules: RULES, reader, fallback, budgetMs: 5000});
}

describe("verifyLabels — deterministic-first LLM fallback", () => {
  it("without a fallback, a field the fast pass missed simply fails", async () => {
    const result = await verifyLabels({images: IMAGES, type: TYPE, expected: EXPECTED, rules: RULES, reader: new StandInReader(missedNetContents())});
    expect(result.reasons.map((reason) => reason.id)).toContain("net-contents-missing");
    expect(result.assisted).toBe(false);
  });

  it("rechecks the text to rescue a required field the fast pass missed, and passes", async () => {
    const fallback = new FakeFallback([{field: "net-contents", state: "found", text: "One pint nine ounces", basis: "confirmed"}]);
    const result = await runWith(new StandInReader(missedNetContents()), fallback);
    expect(result.outcome).toBe("pass");
    // A model rescued the field, so the run is marked model-assisted.
    expect(result.assisted).toBe(true);
    // Only the missing field was handed off; the OCR text went with it.
    expect(fallback.lastRecheck?.fields).toEqual(["net-contents"]);
    expect(fallback.lastRecheck?.text).toContain("ONE PINT NINE OUNCES");
  });

  it("re-reads the image to rescue a warning read too poorly to judge, and passes", async () => {
    // Deterministic pass reads the warning as unreadable (a poor read).
    const failing = await runWith(new StandInReader(mangledWarning()), new FakeFallback());
    expect(failing.reasons.map((reason) => reason.id)).toContain("warning-unreadable");
    // A vision re-read recovers the warning cleanly → passes.
    const fallback = new FakeFallback([], [{field: "warning", state: "found", text: GOVERNMENT_WARNING_TEXT, basis: "confirmed"}]);
    const result = await runWith(new StandInReader(mangledWarning()), fallback);
    expect(result.outcome).toBe("pass");
    expect(result.assisted).toBe(true);
    expect(fallback.lastReread?.fields).toEqual(["warning"]);
  });

  it("leaves the failure in place when the fallback finds nothing", async () => {
    const result = await runWith(new StandInReader(missedNetContents()), new FakeFallback());
    expect(result.outcome).toBe("fail");
    expect(result.reasons.map((reason) => reason.id)).toContain("net-contents-missing");
    // The fallback rescued nothing, so the run is not marked model-assisted.
    expect(result.assisted).toBe(false);
  });

  it("does not consult the fallback when the fast pass already passes", async () => {
    const fallback = new FakeFallback();
    const result = await runWith(new StandInReader(cleanBourbon()), fallback);
    expect(result.outcome).toBe("pass");
    expect(result.assisted).toBe(false);
    expect(fallback.lastRecheck).toBeUndefined();
    expect(fallback.lastReread).toBeUndefined();
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
