import {aggregate} from "../aggregate/aggregate";
import {CanonicalField, ExpectedValues, FieldRead, LabelReadingReport, Reason, ValidationResult} from "../types";
import {judge} from "./validate";
import {GOVERNMENT_WARNING_TEXT, makeSpiritsRules} from "./__fixtures__/spirits-rules.fixture";

// --- test helpers ---------------------------------------------------------
const DOMESTIC: ExpectedValues = {
  brand: "Old Tom Distillery",
  nameAndAddress: "Old Tom Distillery, Bardstown, KY",
  importedOrDomestic: "domestic"
};

/** A fully-compliant domestic bourbon: everything present and correct. */
function validReports(): LabelReadingReport[] {
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

function labelOf(reports: LabelReadingReport[], label: string): LabelReadingReport {
  const report = reports.find((candidate) => candidate.label === label);
  if (!report) {
    throw new Error(`test setup: no label "${label}"`);
  }
  return report;
}

function setRead(reports: LabelReadingReport[], label: string, read: FieldRead): void {
  const report = labelOf(reports, label);
  const index = report.fields.findIndex((fieldRead) => fieldRead.field === read.field);
  if (index >= 0) {
    report.fields[index] = read;
  } else {
    report.fields.push(read);
  }
}

function removeField(reports: LabelReadingReport[], label: string, field: CanonicalField): void {
  const report = labelOf(reports, label);
  report.fields = report.fields.filter((fieldRead) => fieldRead.field !== field);
}

function run(reports: LabelReadingReport[], expected: ExpectedValues = DOMESTIC): ValidationResult {
  return judge({
    aggregated: aggregate(reports),
    expected,
    rules: makeSpiritsRules()
  });
}

function ids(result: ValidationResult): string[] {
  return result.reasons.map((reason) => reason.id);
}

function reasonFor(result: ValidationResult, id: string): Reason | undefined {
  return result.reasons.find((reason) => reason.id === id);
}
// --- the baseline ---------------------------------------------------------
describe("judge — a fully compliant bourbon", () => {
  it("passes with no reasons", () => {
    const result = run(validReports());
    expect(result.outcome).toBe("pass");
    expect(result.reasons).toEqual([]);
  });
  it("derives the outcome from the reasons, never sets it alone", () => {
    const reports = validReports();
    removeField(reports, "front", "brand");
    const result = run(reports);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.outcome).toBe("fail");
  });
});
// --- warning --------------------------------------------------------------
describe("warning", () => {
  it("passes: the correct warning on the back label", () => {
    expect(run(validReports()).outcome).toBe("pass");
  });
  it("fails warning-missing: absent from every label", () => {
    const reports = validReports();
    removeField(reports, "back", "warning");
    expect(ids(run(reports))).toContain("warning-missing");
  });
  it("fails warning-wrong: a word is changed", () => {
    const reports = validReports();
    setRead(reports, "back", {
      field: "warning",
      state: "found",
      text: GOVERNMENT_WARNING_TEXT.replace("birth defects", "birth defect"),
      basis: "confirmed"
    });
    expect(ids(run(reports))).toContain("warning-wrong");
  });
  it("fails warning-caps: right words but GOVERNMENT WARNING not capitalized", () => {
    const reports = validReports();
    setRead(reports, "back", {
      field: "warning",
      state: "found",
      text: GOVERNMENT_WARNING_TEXT.replace("GOVERNMENT WARNING", "Government Warning"),
      basis: "confirmed"
    });
    const result = run(reports);
    expect(ids(result)).toContain("warning-caps");
    expect(ids(result)).not.toContain("warning-wrong");
  });
  it("passes when the whole warning is printed in all caps", () => {
    const reports = validReports();
    setRead(reports, "back", {
      field: "warning",
      state: "found",
      text: GOVERNMENT_WARNING_TEXT.toUpperCase(),
      basis: "confirmed"
    });
    expect(run(reports).outcome).toBe("pass");
  });
});
// --- brand ----------------------------------------------------------------
describe("brand", () => {
  it("passes across harmless case/punctuation differences", () => {
    const reports = validReports();
    setRead(reports, "front", {
      field: "brand",
      state: "found",
      text: "STONE'S THROW",
      basis: "confirmed"
    });
    const result = run(reports, {...DOMESTIC, brand: "Stone's Throw"});
    expect(ids(result)).not.toContain("brand-wrong");
  });
  it("fails brand-wrong: differs from the application brand", () => {
    const reports = validReports();
    setRead(reports, "front", {
      field: "brand",
      state: "found",
      text: "Old Tom Distilling Co.",
      basis: "confirmed"
    });
    const result = run(reports);
    expect(ids(result)).toContain("brand-wrong");
    const reason = reasonFor(result, "brand-wrong");
    expect(reason?.labels).toEqual(["front"]);
    expect(reason?.expected).toBe("Old Tom Distillery");
    expect(reason?.found).toBe("Old Tom Distilling Co.");
  });
  it("fails brand-missing: no brand found anywhere", () => {
    const reports = validReports();
    removeField(reports, "front", "brand");
    const reason = reasonFor(run(reports), "brand-missing");
    expect(reason).toBeDefined();
    expect(reason?.labels).toEqual([]);
  });
});
// --- name and address -----------------------------------------------------
describe("name and address", () => {
  it("passes: right producer, wrapped in \"Bottled by …, City, ST\"", () => {
    expect(run(validReports()).outcome).toBe("pass");
  });
  it("fails name-address-wrong: a different producer", () => {
    const reports = validReports();
    setRead(reports, "front", {
      field: "name-and-address",
      state: "found",
      text: "Bottled by New Town Distillery, Bardstown, KY",
      basis: "confirmed"
    });
    expect(ids(run(reports))).toContain("name-address-wrong");
  });
  it("fails name-address-missing: none found anywhere", () => {
    const reports = validReports();
    removeField(reports, "front", "name-and-address");
    expect(ids(run(reports))).toContain("name-address-missing");
  });
});
// --- alcohol content ------------------------------------------------------
describe("alcohol content", () => {
  it("passes: a properly formed statement is present", () => {
    expect(run(validReports()).outcome).toBe("pass");
  });
  it("fails alcohol-missing: none on any label", () => {
    const reports = validReports();
    removeField(reports, "front", "alcohol");
    expect(ids(run(reports))).toContain("alcohol-missing");
  });
});
// --- net contents ---------------------------------------------------------
describe("net contents", () => {
  it("passes: a properly formed statement is present", () => {
    expect(run(validReports()).outcome).toBe("pass");
  });
  it("fails net-contents-missing: none on any label", () => {
    const reports = validReports();
    removeField(reports, "front", "net-contents");
    expect(ids(run(reports))).toContain("net-contents-missing");
  });
});
// --- class/type -----------------------------------------------------------
describe("class/type", () => {
  it("passes: a valid designation (\"Kentucky Straight Bourbon Whiskey\")", () => {
    expect(run(validReports()).outcome).toBe("pass");
  });
  it("fails class-type-invalid: a non-designation phrase", () => {
    const reports = validReports();
    setRead(reports, "front", {
      field: "class-type",
      state: "found",
      text: "Premium Smooth Spirit",
      basis: "confirmed"
    });
    const result = run(reports);
    expect(ids(result)).toContain("class-type-invalid");
    expect(ids(result)).not.toContain("class-type-unconfirmed");
  });
  it("fails class-type-unconfirmed: a specialty free-form name (a guess)", () => {
    const reports = validReports();
    setRead(reports, "front", {
      field: "class-type",
      state: "found",
      text: "Grandpa's Midnight Elixir",
      basis: "guess"
    });
    const result = run(reports);
    expect(ids(result)).toContain("class-type-unconfirmed");
    expect(ids(result)).not.toContain("class-type-invalid");
  });
  it("fails class-type-missing: nothing in the class/type spot", () => {
    const reports = validReports();
    removeField(reports, "front", "class-type");
    expect(ids(run(reports))).toContain("class-type-missing");
  });
});
// --- country of origin ----------------------------------------------------
describe("country of origin", () => {
  it("fails country-of-origin-missing: imported with none shown", () => {
    const reports = validReports();
    const result = run(reports, {
      ...DOMESTIC,
      importedOrDomestic: "imported"
    });
    expect(ids(result)).toContain("country-of-origin-missing");
  });
  it("passes: domestic product with no country of origin (rule does not apply)", () => {
    const result = run(validReports());
    expect(result.outcome).toBe("pass");
    expect(ids(result)).not.toContain("country-of-origin-missing");
  });
  it("passes: imported product that shows a country of origin", () => {
    const reports = validReports();
    setRead(reports, "back", {
      field: "country-of-origin",
      state: "found",
      text: "Product of Scotland",
      basis: "confirmed"
    });
    const result = run(reports, {
      ...DOMESTIC,
      importedOrDomestic: "imported"
    });
    expect(result.outcome).toBe("pass");
  });
  it("leaves no trace for a domestic product — not even a note", () => {
    const result = run(validReports());
    expect(ids(result).some((id) => id.startsWith("country-of-origin"))).toBe(false);
  });
});
// --- labels agreeing ------------------------------------------------------
describe("labels agreeing", () => {
  it("fails alcohol-conflict: 45% on one label, 40% on another", () => {
    const reports = validReports();
    setRead(reports, "back", {
      field: "alcohol",
      state: "found",
      text: "40% Alc./Vol. (80 Proof)",
      basis: "confirmed"
    });
    const result = run(reports);
    expect(ids(result)).toContain("alcohol-conflict");
    const reason = reasonFor(result, "alcohol-conflict");
    expect(reason?.labels.sort()).toEqual(["back", "front"]);
    expect(reason?.values).toEqual([
      {label: "front", value: "45% Alc./Vol. (90 Proof)"},
      {label: "back", value: "40% Alc./Vol. (80 Proof)"}
    ]);
  });
  it("fails brand-conflict: two brand spellings, without also firing brand-wrong", () => {
    const reports = validReports();
    setRead(reports, "back", {
      field: "brand",
      state: "found",
      text: "Old Tom Distilling Co.",
      basis: "confirmed"
    });
    const result = run(reports);
    expect(ids(result)).toContain("brand-conflict");
    // The front still matches the expected brand, so it is not also "wrong".
    expect(ids(result)).not.toContain("brand-wrong");
  });
  it("passes when the labels are consistent", () => {
    expect(run(validReports()).outcome).toBe("pass");
  });
});
// --- unreadable required field --------------------------------------------
describe("unreadable required field", () => {
  it("fails rather than slipping through: warning unreadable on the only label carrying it", () => {
    const reports = validReports();
    setRead(reports, "back", {field: "warning", state: "unreadable"});
    const result = run(reports);
    expect(result.outcome).toBe("fail");
    const reason = reasonFor(result, "warning-unreadable");
    expect(reason).toBeDefined();
    expect(reason?.labels).toEqual(["back"]);
  });
});
// --- sulfites (no false fail) ---------------------------------------------
describe("sulfites", () => {
  it("the spirits rules carry no sulfite rule", () => {
    const rules = makeSpiritsRules();
    expect(rules.fields.some((rule) => rule.field.includes("sulfite"))).toBe(false);
  });
  it("a passing spirit never produces a sulfite reason", () => {
    const result = run(validReports());
    expect(result.outcome).toBe("pass");
    expect(ids(result).some((id) => id.includes("sulfite"))).toBe(false);
  });
});
