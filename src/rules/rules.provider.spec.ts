import {DrinkType} from "../core";
import {RulesProvider} from "./rules.provider";

describe("RulesProvider", () => {
  const provider = new RulesProvider();

  it.each<DrinkType>(["distilled-spirits", "wine", "malt-beverage"])(
    "has compiled rules for %s so the check never throws",
    (type) => {
      const rules = provider.forType(type);
      expect(rules.type).toBe(type);
      expect(rules.fields.length).toBeGreaterThan(0);
    }
  );

  it("throws for a drink type with no compiled rules", () => {
    expect(() => provider.forType("grog" as DrinkType)).toThrow(/no rules compiled/);
  });
});
