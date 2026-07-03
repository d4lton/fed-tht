import {z} from "zod";
import {LabelReadingReport} from "../core";

/**
 * The fixed shape the model must answer in — the label-report shape, enforced
 * through the AI SDK's structured output rather than free-form text. A response
 * that does not fit fails plainly (the SDK throws) instead of being silently
 * wrong. The `label` is not asked of the model; it comes from the image and is
 * attached afterward.
 */
export const labelReadSchema = z.object({
  field: z.enum(["brand", "name-and-address", "warning", "alcohol", "net-contents", "class-type", "country-of-origin"]),
  state: z.enum(["found", "absent", "unreadable"]),
  text: z.string().optional(),
  where: z.string().optional(),
  basis: z.enum(["confirmed", "guess"]).optional()
});

export const labelReportSchema = z.object({
  fields: z.array(labelReadSchema),
  notes: z.array(z.string()).optional()
});

export type RawLabelReport = z.infer<typeof labelReportSchema>;

/** Attach the label id to the model's read to form the report the pipeline uses. */
export function toLabelReadingReport(raw: RawLabelReport, label: string): LabelReadingReport {
  const report: LabelReadingReport = {label, fields: raw.fields};
  if (raw.notes) {
    report.notes = raw.notes;
  }
  return report;
}
