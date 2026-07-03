import { Basis, CanonicalField, LabelReadingReport } from "../types";

/**
 * Combine (pipeline step 3): merge the per-image reads into one view across all
 * of an application's labels.
 *
 * It collects — it does not judge. For each field it carries every label's
 * observation (so nothing is silently dropped and first-found never quietly
 * wins) plus the unreadable/absent states. Whether the found values *agree*,
 * and whether the field is *present enough*, are decisions the judge makes,
 * because they depend on per-field comparison leniency the rules carry.
 */

/** One label's found observation of a field. */
export interface FieldObservation {
  label: string;
  text?: string;
  basis?: Basis;
}

/** Everything the labels observed about one field, gathered across the set. */
export interface AggregatedField {
  field: CanonicalField;
  /** Every label that found the field, with what it read. */
  found: FieldObservation[];
  /** Labels where the spot the field might occupy was unreadable. */
  unreadableLabels: string[];
  /** Labels that reported the field absent. */
  absentLabels: string[];
}

export interface AggregatedInfo {
  /** Every label ID seen, in first-seen order. */
  labels: string[];
  /** The combined view per field. A field no label mentioned simply has no entry. */
  byField: Partial<Record<CanonicalField, AggregatedField>>;
}

export function aggregate(reports: LabelReadingReport[]): AggregatedInfo {
  const labels: string[] = [];
  const byField: Partial<Record<CanonicalField, AggregatedField>> = {};
  const ensure = (field: CanonicalField): AggregatedField => {
    let entry = byField[field];
    if (!entry) {
      entry = { field, found: [], unreadableLabels: [], absentLabels: [] };
      byField[field] = entry;
    }
    return entry;
  };
  for (const report of reports) {
    if (!labels.includes(report.label)) {
      labels.push(report.label);
    }
    for (const read of report.fields) {
      const entry = ensure(read.field);
      switch (read.state) {
        case "found":
          entry.found.push({
            label: report.label,
            text: read.text,
            basis: read.basis
          });
          break;
        case "unreadable":
          entry.unreadableLabels.push(report.label);
          break;
        case "absent":
          entry.absentLabels.push(report.label);
          break;
      }
    }
  }
  return { labels, byField };
}
