import { Designation } from "../types";
import { matchesDesignation } from "./match";

const DESIGNATIONS: Designation[] = [
  { designation: "Bourbon Whiskey", coreTerms: ["bourbon whiskey", "bourbon"] },
  { designation: "Gin", coreTerms: ["gin"] },
  { designation: "Rum", coreTerms: ["rum"] }
];
describe("matchesDesignation", () => {
  it("finds a core term inside a longer phrase", () => {
    expect(matchesDesignation("Kentucky Straight Bourbon Whiskey", DESIGNATIONS)).toBe(true);
  });
  it("rejects a non-designation phrase", () => {
    expect(matchesDesignation("Premium Smooth Spirit", DESIGNATIONS)).toBe(false);
  });
  it("does not match a core term as a substring of another word", () => {
    expect(matchesDesignation("Imagine Spirits", DESIGNATIONS)).toBe(false);
    expect(matchesDesignation("Broad Spectrum", DESIGNATIONS)).toBe(false);
  });
});
