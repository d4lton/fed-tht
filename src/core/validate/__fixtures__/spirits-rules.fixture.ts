import { RulesForType } from '../../types';

/**
 * The distilled-spirits rules, built in code for the core's own tests — the
 * pure core is fed rules data directly, never a file. Mirrors the shape the
 * YAML loader produces (see src/rules), kept small and readable.
 */

export const GOVERNMENT_WARNING_TEXT =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not ' +
  'drink alcoholic beverages during pregnancy because of the risk of birth ' +
  'defects. (2) Consumption of alcoholic beverages impairs your ability to ' +
  'drive a car or operate machinery, and may cause health problems.';

export function makeSpiritsRules(): RulesForType {
  return {
    type: 'distilled-spirits',
    fields: [
      {
        field: 'brand',
        find: 'from_expected',
        match: 'lenient',
        obligation: { required: true },
        reasons: {
          missing: 'brand-missing',
          wrong: 'brand-wrong',
          conflict: 'brand-conflict',
        },
      },
      {
        field: 'name-and-address',
        find: 'from_expected',
        match: 'loose',
        obligation: { required: true },
        reasons: {
          missing: 'name-address-missing',
          wrong: 'name-address-wrong',
          conflict: 'name-address-conflict',
        },
      },
      {
        field: 'warning',
        find: 'fixed_text',
        fixedText: {
          id: 'government-warning',
          text: GOVERNMENT_WARNING_TEXT,
          capsWords: ['GOVERNMENT WARNING'],
        },
        obligation: { required: true },
        reasons: {
          missing: 'warning-missing',
          wrong: 'warning-wrong',
          caps: 'warning-caps',
          unreadable: 'warning-unreadable',
          conflict: 'warning-conflict',
        },
      },
      {
        field: 'alcohol',
        find: 'by_format',
        format: 'alcohol',
        obligation: { required: true },
        reasons: { missing: 'alcohol-missing', conflict: 'alcohol-conflict' },
      },
      {
        field: 'net-contents',
        find: 'by_format',
        format: 'net-contents',
        obligation: { required: true },
        reasons: {
          missing: 'net-contents-missing',
          conflict: 'net-contents-conflict',
        },
      },
      {
        field: 'class-type',
        find: 'from_list',
        designations: [
          { designation: 'Whisky', coreTerms: ['whisky', 'whiskey'] },
          {
            designation: 'Bourbon Whiskey',
            coreTerms: ['bourbon whiskey', 'bourbon'],
          },
          { designation: 'Rye Whiskey', coreTerms: ['rye whiskey', 'rye'] },
          { designation: 'Vodka', coreTerms: ['vodka'] },
          { designation: 'Gin', coreTerms: ['gin'] },
          { designation: 'Rum', coreTerms: ['rum'] },
        ],
        obligation: { required: true },
        reasons: {
          missing: 'class-type-missing',
          invalid: 'class-type-invalid',
          unconfirmed: 'class-type-unconfirmed',
          conflict: 'class-type-conflict',
        },
      },
      {
        field: 'country-of-origin',
        find: 'by_format',
        format: 'country-of-origin',
        obligation: {
          required: true,
          condition: { tag: 'imported', source: 'application' },
        },
        reasons: {
          missing: 'country-of-origin-missing',
          conflict: 'country-of-origin-conflict',
        },
      },
    ],
  };
}
