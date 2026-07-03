import {closeSync, openSync, writeSync, mkdtempSync} from "fs";
import {tmpdir} from "os";
import {join} from "path";
import type {LanguageModel} from "ai";
import type {LanguageModelV3GenerateResult} from "@ai-sdk/provider";
import {MockLanguageModelV3} from "ai/test";
import {GOVERNMENT_WARNING_TEXT} from "../core/validate/__fixtures__/spirits-rules.fixture";
import {LabelImage, ThingsToLookFor} from "./label-reader";
import {ClaudeLabelReader, ReaderError} from "./claude.reader";

// A 1x1 PNG written to a temp file. The mock model ignores the bytes; the reader
// just needs a real file to load.
const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
let imagePath: string;
beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "fed-tht-reader-"));
  imagePath = join(dir, "label.png");
  const fd = openSync(imagePath, "w");
  writeSync(fd, PNG_1X1);
  closeSync(fd);
});
const LOOK_FOR: ThingsToLookFor = {
  brand: "Old Tom Distillery",
  nameAndAddress: "Old Tom Distillery, Bardstown, KY",
  warning: {
    id: "government-warning",
    text: GOVERNMENT_WARNING_TEXT,
    capsWords: ["GOVERNMENT WARNING"]
  },
  designations: [{designation: "Bourbon Whiskey", coreTerms: ["bourbon"]}]
};

interface Captured {
  prompt: unknown;
}

/** A mock Claude that returns fixed text and records the prompt it was given. */
function mockModel(responseText: string, captured?: Captured): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: (options) => {
      if (captured) {
        captured.prompt = options.prompt;
      }
      // The v3 result type has a deeply-nested usage shape; the runtime accepts
      // the simple flat form, so cast rather than hand-build the full type.
      const result = {
        content: [{type: "text", text: responseText}],
        finishReason: "stop",
        usage: {inputTokens: 1, outputTokens: 1, totalTokens: 2},
        warnings: []
      } as unknown as LanguageModelV3GenerateResult;
      return Promise.resolve(result);
    }
  });
}

function image(source: string | undefined = imagePath): LabelImage {
  return {label: "front", source};
}

/** Collect every bit of text the model was prompted with. */
function promptText(captured: Captured): string {
  const parts: string[] = [];
  const messages = captured.prompt as Array<{
    content: unknown;
  }>;
  for (const message of messages) {
    if (typeof message.content === "string") {
      parts.push(message.content);
    } else if (Array.isArray(message.content)) {
      for (const part of message.content as Array<{
        type: string;
        text?: string;
      }>) {
        if (part.type === "text" && part.text) {
          parts.push(part.text);
        }
      }
    }
  }
  return parts.join("\n");
}

describe("ClaudeLabelReader", () => {
  it("maps a well-formed model answer into a label report for this image", async () => {
    const answer = JSON.stringify({
      fields: [
        {
          field: "brand",
          state: "found",
          text: "Old Tom Distillery",
          where: "top center",
          basis: "confirmed"
        },
        {field: "warning", state: "absent"}
      ],
      notes: ["image is a little dark"]
    });
    const reader = new ClaudeLabelReader(mockModel(answer), 5000);
    const report = await reader.read(image(), "distilled-spirits", LOOK_FOR);
    expect(report).toEqual({
      label: "front",
      fields: [
        {
          field: "brand",
          state: "found",
          text: "Old Tom Distillery",
          where: "top center",
          basis: "confirmed"
        },
        {field: "warning", state: "absent"}
      ],
      notes: ["image is a little dark"]
    });
  });
  it("fails plainly when the model answer does not fit the label-report shape", async () => {
    // "state" is not one of found/absent/unreadable — the shape guard rejects it.
    const bogus = JSON.stringify({
      fields: [{field: "brand", state: "maybe?"}]
    });
    const reader = new ClaudeLabelReader(mockModel(bogus), 5000);
    await expect(reader.read(image(), "distilled-spirits", LOOK_FOR)).rejects.toBeInstanceOf(ReaderError);
    await expect(reader.read(image(), "distilled-spirits", LOOK_FOR)).rejects.toThrow(/front/);
  });
  it("hands the model the things to look for and the image, and forbids judging", async () => {
    const captured: Captured = {prompt: undefined};
    const reader = new ClaudeLabelReader(mockModel(JSON.stringify({fields: []}), captured), 5000);
    await reader.read(image(), "distilled-spirits", LOOK_FOR);
    const text = promptText(captured);
    expect(text).toContain("Old Tom Distillery"); // expected brand
    expect(text).toContain("Bardstown, KY"); // expected name and address
    expect(text).toContain("GOVERNMENT WARNING"); // the fixed warning wording
    expect(text).toContain("Bourbon Whiskey"); // a legal designation to match
    expect(text.toLowerCase()).toContain("never decide"); // only describe, don't judge
    // The image itself is attached as a file part.
    const messages = captured.prompt as Array<{ content: unknown }>;
    const userParts = messages.find((message) => Array.isArray(message.content))?.content as Array<{
      type: string;
      mediaType?: string;
    }>;
    expect(userParts.some((part) => part.type === "file" && part.mediaType === "image/png")).toBe(true);
  });
  it("fails plainly when the image has no source to read", async () => {
    const reader = new ClaudeLabelReader(mockModel(JSON.stringify({fields: []})), 5000);
    const sourceless: LabelImage = {label: "front"};
    await expect(reader.read(sourceless, "distilled-spirits", LOOK_FOR)).rejects.toBeInstanceOf(ReaderError);
  });
});
