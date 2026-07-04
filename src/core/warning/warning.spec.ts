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
  it("ok: the warning followed by other label text (net contents, sulfites, barcode)", () => {
    const withTrailing = `${GOVERNMENT_WARNING_TEXT.toUpperCase()}\nCONTAINS SULFITES\n750 ML\nALC. 13.5% BY VOL\n1234567890`;
    expect(checkWarning(withTrailing, WARNING)).toBe("ok");
  });
  it("unreadable: OCR runs words together and drops a letter (a poor read, not a wrong warning)", () => {
    // A sideways / low-quality print, exactly like the Fire Alarm label.
    const mangled = GOVERNMENT_WARNING_TEXT.toUpperCase()
      .replace("YOUR ABILITY", "YOURABILITY")
      .replace("CAR OR", "CAROR")
      .replace("HEALTH PROBLEMS", "HEALTHPROBLEM");
    expect(checkWarning(mangled, WARNING)).toBe("unreadable");
  });
  it("unreadable: a single-letter difference is ambiguous (OCR vs typo), left for review", () => {
    expect(checkWarning(GOVERNMENT_WARNING_TEXT.replace("Surgeon General", "Surgeon Generals"), WARNING)).toBe("unreadable");
  });
  it("wrong-words: a substantially different warning", () => {
    const different = GOVERNMENT_WARNING_TEXT.replace(
      "impairs your ability to drive a car or operate machinery, and may cause health problems.",
      "is a great way to relax and unwind after a long day at work."
    );
    expect(checkWarning(different, WARNING)).toBe("wrong-words");
  });
  it("bad-caps: right words but GOVERNMENT WARNING not capitalized", () => {
    expect(checkWarning(GOVERNMENT_WARNING_TEXT.replace("GOVERNMENT WARNING", "Government Warning"), WARNING)).toBe("bad-caps");
  });
});
