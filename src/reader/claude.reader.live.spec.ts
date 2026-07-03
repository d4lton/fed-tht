import { existsSync } from "fs";
import { join } from "path";
import { aggregate, ExpectedValues, judge } from "../core";
import { loadSpiritsRules } from "../rules/rules-loader";
import { thingsToLookFor } from "../pipeline/verify";
import { createClaudeReader } from "./claude.reader";
import { LabelImage } from "./label-reader";

/**
 * The costly reading tests: they call the real model against generated label
 * images. Gated on an API key (and the image files) so the default suite stays
 * fast and free — the cheap hand-written-report tests carry the coverage.
 *
 * Run with:  ANTHROPIC_API_KEY=sk-... npm test
 */

const LABELS = join(__dirname, "__fixtures__", "labels");
const apiKey = process.env.ANTHROPIC_API_KEY;
const imagesPresent = existsSync(join(LABELS, "front-clean.png"));
const LIVE = Boolean(apiKey) && imagesPresent;
const rules = loadSpiritsRules();
const EXPECTED: ExpectedValues = {
  brand: "Old Tom Distillery",
  nameAndAddress: "Old Tom Distillery, Bardstown, KY",
  importedOrDomestic: "domestic"
};

/** read → combine → judge, reading real image files through the real reader. */
async function verifyImages(images: LabelImage[]) {
  const reader = createClaudeReader({
    apiKey: apiKey ?? "",
    model: process.env.READER_MODEL ?? "claude-haiku-4-5",
    timeoutMs: 30_000
  });
  const lookFor = thingsToLookFor(EXPECTED, rules);
  const reports = await Promise.all(images.map((image) => reader.read(image, "distilled-spirits", lookFor)));
  return judge({ aggregated: aggregate(reports), expected: EXPECTED, rules });
}

const suite = LIVE ? describe : describe.skip;
suite("ClaudeLabelReader against real images (costly — needs ANTHROPIC_API_KEY)", () => {
  jest.setTimeout(90_000);
  it("a clean bourbon reads to a passing result", async () => {
    const result = await verifyImages([
      { label: "front", source: join(LABELS, "front-clean.png") },
      { label: "back", source: join(LABELS, "back-clean.png") }
    ]);
    expect(result.outcome).toBe("pass");
  });
  it("a mangled bourbon reads to a fail with the right reasons", async () => {
    const result = await verifyImages([
      { label: "front", source: join(LABELS, "front-broken.png") },
      { label: "back", source: join(LABELS, "back-broken.png") }
    ]);
    expect(result.outcome).toBe("fail");
    const ids = result.reasons.map((r) => r.id);
    expect(ids).toContain("brand-wrong");
    expect(ids).toContain("warning-missing");
  });
});
// Ensure the file is always a valid (possibly skipped) suite.
if (!LIVE) {
  describe("ClaudeLabelReader live reading tests", () => {
    it.skip(`skipped: ${apiKey ? "images missing" : "no ANTHROPIC_API_KEY"}`, () => {
      // intentionally empty
    });
  });
}
