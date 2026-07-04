import {CanonicalField, ExpectedValues, FieldRead} from "../../core";
import {thingsToLookFor} from "../../pipeline/verify";
import {loadSpiritsRules} from "../../rules/rules-loader";
import {extractFields} from "./extract";

/**
 * The OCR reader's extraction is where "describe the label" happens in code, so
 * each field gets both a found case and a failing (absent) case — a check that
 * cannot come up absent is not really testing detection.
 */

const EXPECTED: ExpectedValues = {
  brand: "Old Tom Distillery",
  nameAndAddress: "Old Tom Distillery, Bardstown, KY",
  importedOrDomestic: "domestic"
};
const lookFor = thingsToLookFor(EXPECTED, loadSpiritsRules());

const FRONT = [
  "OLD TOM DISTILLERY",
  "Kentucky Straight",
  "Bourbon Whiskey",
  "Distilled and Bottled by",
  "Old Tom Distillery, Bardstown, KY",
  "45% Alc./Vol. (90 Proof)",
  "750 mL"
].join("\n");

const WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not " +
  "drink alcoholic beverages during pregnancy because of the risk of birth " +
  "defects. (2) Consumption of alcoholic beverages impairs your ability to " +
  "drive a car or operate machinery, and may cause health problems.";

function read(text: string, field: CanonicalField): FieldRead {
  const found = extractFields(text, "distilled-spirits", lookFor).find((entry) => entry.field === field);
  if (!found) {
    throw new Error(`no read for field "${field}"`);
  }
  return found;
}

describe("OCR extraction — found cases (a clean front label)", () => {
  it("confirms the brand by anchoring to the expected value", () => {
    expect(read(FRONT, "brand")).toEqual({field: "brand", state: "found", text: "Old Tom Distillery", basis: "confirmed"});
  });

  it("confirms the name and address, wrapped in extra words", () => {
    expect(read(FRONT, "name-and-address")).toMatchObject({state: "found", basis: "confirmed"});
  });

  it("confirms the class/type via a legal core term", () => {
    const designation = read(FRONT, "class-type");
    expect(designation.state).toBe("found");
    expect(designation.basis).toBe("confirmed");
    expect(designation.text?.toLowerCase()).toContain("bourbon");
  });

  it("finds a properly-shaped alcohol statement", () => {
    expect(read(FRONT, "alcohol")).toMatchObject({state: "found", text: "45% Alc./Vol. (90 Proof)"});
  });

  it("finds a properly-shaped net-contents statement", () => {
    expect(read(FRONT, "net-contents")).toMatchObject({state: "found", text: "750 mL"});
  });

  it("reports the warning absent on a front label that has none", () => {
    expect(read(FRONT, "warning").state).toBe("absent");
  });
});

describe("OCR extraction — the warning, anchored on its heading", () => {
  it("finds the warning and keeps its capitalization for the judge", () => {
    const warning = read(WARNING, "warning");
    expect(warning.state).toBe("found");
    expect(warning.text).toContain("GOVERNMENT WARNING");
  });

  it("reads a country-of-origin statement as a guess", () => {
    expect(read("Product of Scotland", "country-of-origin")).toMatchObject({state: "found", basis: "guess"});
  });
});

describe("OCR extraction — real-label quirks (regressions)", () => {
  it("reads 'ALC. 13.5% BY VOL' — the alcohol word before the number", () => {
    expect(read("ALC. 13.5% BY VOL", "alcohol")).toMatchObject({state: "found", text: "ALC. 13.5% BY VOL"});
  });

  it("reads '13.5% Alcohol by Volume' — the number before the word", () => {
    expect(read("13.5% Alcohol by Volume", "alcohol").state).toBe("found");
  });

  it("reads a spelled-out net-contents unit like '1 PINT'", () => {
    expect(read("HYATTSVILLE, MD 1 PINT", "net-contents")).toMatchObject({state: "found"});
  });

  it("reads a 'fl oz' net-contents statement", () => {
    expect(read("12 FL OZ", "net-contents").state).toBe("found");
  });

  it("finds the name and address even when the label splits it across the design", () => {
    // Producer at the top, city/state at the bottom, other text in between.
    const split = "MALT & HOP\nBREWERY\nPale Ale\nHoptastic\nHYATTSVILLE, MD 1 PINT";
    const lookForSplit = thingsToLookFor(
      {brand: "Malt & Hop Brewery", nameAndAddress: "Malt & Hop Brewery\nHyattsville, MD", importedOrDomestic: "domestic"},
      loadSpiritsRules()
    );
    const nameAddress = extractFields(split, "malt-beverage", lookForSplit).find((read) => read.field === "name-and-address");
    expect(nameAddress?.state).toBe("found");
  });

  it("anchors the warning on its heading and leaves trailing text for the judge to tolerate", () => {
    const canonical = lookFor.warning?.text ?? "";
    const withTrailing = [canonical, "CONTAINS SULFITES", "750 ML"].join("\n");
    const warning = read(withTrailing, "warning");
    expect(warning.state).toBe("found");
    expect(warning.text).toContain("GOVERNMENT WARNING");
    expect(warning.text).toContain("health problems");
  });

  it("captures only the warning's own lines, not a volume/alcohol line OCR places after it", () => {
    // Like the sideways Fire Alarm warning, followed by unrelated fields.
    const canonical = lookFor.warning?.text ?? "";
    const withOtherFields = [canonical, "12 fl. ounces", "5% alcohol by volume"].join("\n");
    const warning = read(withOtherFields, "warning");
    expect(warning.text).toContain("health problems");
    expect(warning.text).not.toMatch(/ounces|alcohol by volume/i);
  });
});

describe("OCR extraction — failing (absent) cases, one per field", () => {
  it("brand absent when the expected brand is nowhere in the text", () => {
    expect(read("Kentucky Straight Bourbon Whiskey\n750 mL", "brand").state).toBe("absent");
  });

  it("name-and-address absent when the producer line is missing", () => {
    expect(read("OLD TOM DISTILLERY\nBourbon Whiskey", "name-and-address").state).toBe("absent");
  });

  it("warning absent when there is no GOVERNMENT WARNING heading", () => {
    expect(read("According to the Surgeon General, women should not drink", "warning").state).toBe("absent");
  });

  it("alcohol absent when no alcohol statement is present", () => {
    expect(read("OLD TOM DISTILLERY\n750 mL", "alcohol").state).toBe("absent");
  });

  it("net-contents absent when no volume is present", () => {
    expect(read("OLD TOM DISTILLERY\n45% Alc./Vol.", "net-contents").state).toBe("absent");
  });

  it("class-type absent when no legal designation appears", () => {
    expect(read("OLD TOM DISTILLERY\nOld Tom Distillery, Bardstown, KY", "class-type").state).toBe("absent");
  });
});
