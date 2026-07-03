import {normalizedText} from "../core";
import {GOVERNMENT_WARNING_TEXT} from "../core/validate/__fixtures__/spirits-rules.fixture";
import {RuleResources, buildRulesForType, loadSpiritsRules} from "./rules-loader";

describe("loadSpiritsRules (from the YAML data files)", () => {
  const rules = loadSpiritsRules();
  it("loads the distilled-spirits rules", () => {
    expect(rules.type).toBe("distilled-spirits");
    expect(rules.fields.map((rule) => rule.field)).toEqual([
      "brand",
      "name-and-address",
      "warning",
      "alcohol",
      "net-contents",
      "class-type",
      "country-of-origin"
    ]);
  });
  it("resolves the warning fixed text (matching the regulation wording)", () => {
    const warning = rules.fields.find((rule) => rule.field === "warning");
    expect(warning?.fixedText?.capsWords).toEqual(["GOVERNMENT WARNING"]);
    expect(normalizedText(warning?.fixedText?.text ?? "")).toBe(normalizedText(GOVERNMENT_WARNING_TEXT));
  });
  it("resolves the designation list with lowercased core terms", () => {
    const classType = rules.fields.find((rule) => rule.field === "class-type");
    const designations = classType?.designations ?? [];
    expect(designations.length).toBeGreaterThan(0);
    const bourbon = designations.find((designation) => designation.designation === "Bourbon Whiskey");
    expect(bourbon?.coreTerms).toContain("bourbon");
  });
  it("marks country of origin required only when imported", () => {
    const country = rules.fields.find((rule) => rule.field === "country-of-origin");
    expect(country?.obligation.condition).toEqual({
      tag: "imported",
      source: "application"
    });
  });
});
describe("buildRulesForType — checked on load", () => {
  const emptyResources: RuleResources = {fixedTexts: {}, lists: {}};
  it("rejects an unknown drink type", () => {
    expect(() => buildRulesForType({type: "grog", fields: []}, emptyResources)).toThrow(/Invalid rules data/);
  });
  it("rejects a from_list field that names an unknown list", () => {
    const raw = {
      type: "distilled-spirits",
      fields: [
        {
          field: "class-type",
          find: "from_list",
          list: "does-not-exist",
          required: "always",
          reasons: {missing: "class-type-missing"}
        }
      ]
    };
    expect(() => buildRulesForType(raw, emptyResources)).toThrow(/unknown list/);
  });
  it("rejects a field missing its required facet", () => {
    const raw = {
      type: "distilled-spirits",
      fields: [{field: "brand", find: "from_expected", reasons: {}}]
    };
    expect(() => buildRulesForType(raw, emptyResources)).toThrow(/Invalid rules data/);
  });
});
