import {FixedText} from "../types";
import {checkWarning} from "./warning";
import {GOVERNMENT_WARNING_TEXT} from "../validate/__fixtures__/spirits-rules.fixture";

const WARNING: FixedText = {
  id: "government-warning",
  text: GOVERNMENT_WARNING_TEXT,
  capsWords: ["GOVERNMENT WARNING"]
};
describe("checkWarning", () => {
  it("ok: the exact wording", () => {
    expect(checkWarning(GOVERNMENT_WARNING_TEXT, WARNING)).toBe("ok");
  });
  it("ok: whole statement printed in all caps", () => {
    expect(checkWarning(GOVERNMENT_WARNING_TEXT.toUpperCase(), WARNING)).toBe("ok");
  });
  it("wrong-words: a word changed", () => {
    expect(checkWarning(GOVERNMENT_WARNING_TEXT.replace("Surgeon General", "Surgeon Generals"), WARNING)).toBe("wrong-words");
  });
  it("bad-caps: right words but GOVERNMENT WARNING not capitalized", () => {
    expect(checkWarning(GOVERNMENT_WARNING_TEXT.replace("GOVERNMENT WARNING", "Government Warning"), WARNING)).toBe("bad-caps");
  });
});
