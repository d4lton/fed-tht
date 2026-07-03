/**
 * The values the judge compares the label against, drawn from the stored
 * application record. The brand and name/address are compared against the
 * label; imported-or-domestic is a stored fact that switches one rule on or off
 * (it is never looked for on the label). See the Application Record design page.
 */

export type OriginStatus = 'imported' | 'domestic';

export interface ExpectedValues {
  brand: string;
  nameAndAddress: string;
  importedOrDomestic: OriginStatus;
}
