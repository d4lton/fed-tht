import { readFileSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";
import * as Joi from "joi";
import {
  ConditionSource,
  Designation,
  DrinkType,
  FieldRule,
  FindStrategy,
  FixedText,
  FormatKind,
  MatchLeniency,
  Obligation,
  RulesForType
} from "../core/types";

/**
 * The thin adapter that turns the YAML rules data into the core's in-memory
 * `RulesForType`. It reads the files, checks them on load (a malformed rules
 * file fails loudly here, not mid-run), and resolves the `fixed_text` / `list`
 * references into the values the core carries. The core itself never reads
 * files — it is handed the assembled data.
 */

const DATA_DIR = join(__dirname, "data");

// --- raw YAML shapes (before assembly) ------------------------------------

interface RawFixedText {
  id: string;
  text: string;
  caps_words: string[];
}

interface RawDesignation {
  designation: string;
  core_terms: string[];
}

type RawRequired = "always" | { when: string; source: ConditionSource };

interface RawField {
  field: string;
  find: FindStrategy;
  match?: MatchLeniency;
  format?: FormatKind;
  fixed_text?: string;
  list?: string;
  required: RawRequired;
  reasons: Record<string, string>;
}

interface RawRules {
  type: DrinkType;
  fields: RawField[];
}

// --- validation schemas ---------------------------------------------------

const fixedTextSchema = Joi.object({
  id: Joi.string().required(),
  text: Joi.string().required(),
  caps_words: Joi.array().items(Joi.string()).default([])
});
const designationsSchema = Joi.array()
  .items(
    Joi.object({
      designation: Joi.string().required(),
      core_terms: Joi.array().items(Joi.string()).min(1).required()
    })
  )
  .min(1);
const requiredSchema = Joi.alternatives(
  Joi.string().valid("always"),
  Joi.object({
    when: Joi.string().required(),
    source: Joi.string().valid("label", "application", "unavailable").required()
  })
);
const fieldSchema = Joi.object({
  field: Joi.string().required(),
  find: Joi.string().valid("from_expected", "fixed_text", "from_list", "by_format", "none").required(),
  match: Joi.string().valid("lenient", "loose"),
  format: Joi.string().valid("alcohol", "net-contents", "country-of-origin"),
  fixed_text: Joi.string(),
  list: Joi.string(),
  required: requiredSchema.required(),
  reasons: Joi.object().pattern(Joi.string(), Joi.string()).required()
});
const rulesSchema = Joi.object({
  type: Joi.string().valid("wine", "distilled-spirits", "malt-beverage").required(),
  fields: Joi.array().items(fieldSchema).min(1).required()
});

function parse<T>(schema: Joi.Schema, value: unknown, source: string): T {
  const result = schema.validate(value, {
    abortEarly: false,
    convert: true
  }) as Joi.ValidationResult<T>;
  if (result.error) {
    throw new Error(`Invalid rules data in ${source}: ${result.error.message}`);
  }
  return result.value;
}

// --- assembly -------------------------------------------------------------

/** The resolved resources a rules file's fields point at. */
export interface RuleResources {
  fixedTexts: Record<string, FixedText>;
  lists: Record<string, Designation[]>;
}

/**
 * Validate a raw rules object and resolve its references against the given
 * resources. Exposed (not just `loadSpiritsRules`) so the check-on-load
 * behaviour can be tested without touching the filesystem.
 */
export function buildRulesForType(rawRulesInput: unknown, resources: RuleResources, source = "rules"): RulesForType {
  const raw = parse<RawRules>(rulesSchema, rawRulesInput, source);
  const fields = raw.fields.map((field) => assembleField(field, resources, source));
  return { type: raw.type, fields };
}

function assembleField(raw: RawField, resources: RuleResources, source: string): FieldRule {
  const rule: FieldRule = {
    field: raw.field as FieldRule["field"],
    find: raw.find,
    match: raw.match,
    format: raw.format,
    obligation: toObligation(raw.required),
    reasons: raw.reasons
  };
  if (raw.find === "fixed_text") {
    const ref = raw.fixed_text;
    if (!ref) {
      throw new Error(`Invalid rules data in ${source}: field "${raw.field}" uses fixed_text but names no fixed_text`);
    }
    const fixedText = resources.fixedTexts[ref];
    if (!fixedText) {
      throw new Error(`Invalid rules data in ${source}: field "${raw.field}" references unknown fixed_text "${ref}"`);
    }
    rule.fixedText = fixedText;
  }
  if (raw.find === "from_list") {
    const ref = raw.list;
    if (!ref) {
      throw new Error(`Invalid rules data in ${source}: field "${raw.field}" uses from_list but names no list`);
    }
    const list = resources.lists[ref];
    if (!list) {
      throw new Error(`Invalid rules data in ${source}: field "${raw.field}" references unknown list "${ref}"`);
    }
    rule.designations = list;
  }
  if (raw.find === "by_format" && !raw.format) {
    throw new Error(`Invalid rules data in ${source}: field "${raw.field}" uses by_format but names no format`);
  }
  return rule;
}

function toObligation(required: RawRequired): Obligation {
  if (required === "always") {
    return { required: true };
  }
  return {
    required: true,
    condition: { tag: required.when, source: required.source }
  };
}

// --- file loading ---------------------------------------------------------

function loadYamlFile(file: string): unknown {
  return yaml.load(readFileSync(join(DATA_DIR, file), "utf8"));
}

function loadFixedText(file: string): FixedText {
  const raw = parse<RawFixedText>(fixedTextSchema, loadYamlFile(file), file);
  return {
    id: raw.id,
    text: raw.text.trim(),
    capsWords: raw.caps_words
  };
}

function loadDesignations(file: string): Designation[] {
  const raw = parse<RawDesignation[]>(designationsSchema, loadYamlFile(file), file);
  return raw.map((d) => ({
    designation: d.designation,
    coreTerms: d.core_terms.map((t) => t.toLowerCase())
  }));
}

/** Load and check the distilled-spirits rules from the YAML data files. */
export function loadSpiritsRules(): RulesForType {
  const warning = loadFixedText("government-warning.yaml");
  const designations = loadDesignations("spirit-designations.yaml");
  const resources: RuleResources = {
    fixedTexts: { [warning.id]: warning },
    lists: { "spirit-designations": designations }
  };
  return buildRulesForType(loadYamlFile("spirits.rules.yaml"), resources, "spirits.rules.yaml");
}
