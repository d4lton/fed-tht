import {aggregate, ExpectedValues, judge, LabelReadingReport} from "../core";
import {GOVERNMENT_WARNING_TEXT} from "../core/validate/__fixtures__/spirits-rules.fixture";
import {loadSpiritsRules} from "./rules-loader";

/**
 * End-to-end through the real YAML rules: a hand-written bourbon (front + back
 * reads) run through the loaded rules, aggregate, and judge — a clean one
 * passes, a mangled one fails carrying the right reasons.
 */

const rules = loadSpiritsRules();
const EXPECTED: ExpectedValues = {
  brand: "Old Tom Distillery",
  nameAndAddress: "Old Tom Distillery, Bardstown, KY",
  importedOrDomestic: "domestic"
};

function runScenario(reports: LabelReadingReport[]) {
  return judge({
    aggregated: aggregate(reports),
    expected: EXPECTED,
    rules,
    application: "A-1042"
  });
}

describe("a clean bourbon (front + back)", () => {
  it("passes", () => {
    const reports: LabelReadingReport[] = [
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
            text: "Distilled and Bottled by Old Tom Distillery, Bardstown, KY",
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
    const result = runScenario(reports);
    expect(result.application).toBe("A-1042");
    expect(result.outcome).toBe("pass");
    expect(result.reasons).toEqual([]);
  });
});
describe("a mangled bourbon", () => {
  it("fails, carrying a reason for each problem", () => {
    const reports: LabelReadingReport[] = [
      {
        label: "front",
        fields: [
          // wrong brand
          {
            field: "brand",
            state: "found",
            text: "Olde Thomas Distilling Co.",
            basis: "confirmed"
          },
          {
            field: "name-and-address",
            state: "found",
            text: "Bottled by Old Tom Distillery, Bardstown, KY",
            basis: "confirmed"
          },
          // alcohol missing entirely
          {
            field: "net-contents",
            state: "found",
            text: "750 mL",
            basis: "confirmed"
          },
          // bogus, non-legal class/type presented as a designation
          {
            field: "class-type",
            state: "found",
            text: "Premium Smooth Spirit",
            basis: "confirmed"
          }
        ]
      },
      {
        label: "back",
        // warning present but a word changed
        fields: [
          {
            field: "warning",
            state: "found",
            text: GOVERNMENT_WARNING_TEXT.replace("birth defects", "birth defect"),
            basis: "confirmed"
          }
        ]
      }
    ];
    const result = runScenario(reports);
    expect(result.outcome).toBe("fail");
    const ids = result.reasons.map((reason) => reason.id).sort();
    expect(ids).toEqual(["alcohol-missing", "brand-wrong", "class-type-invalid", "warning-wrong"].sort());
  });
});
