import { LabelReadingReport } from "../core";
import { LabelImage, LabelReader } from "./label-reader";

/**
 * A stand-in reader: instead of looking at an image, it returns pre-set reads it
 * was handed, matched to the image's label. It fills the reader slot so the
 * whole read → combine → judge flow can run end to end on predictable input,
 * before any real photo-reading exists.
 *
 * It accepts the things-to-look-for (the slot includes them) but does not use
 * them — it just returns the reads it was set up with. Its `read` omits the
 * unused slot parameters, which still satisfies the {@link LabelReader} contract.
 */
export class StandInReader implements LabelReader {
  private readonly reports: Map<string, LabelReadingReport>;

  constructor(reports: Iterable<LabelReadingReport>) {
    this.reports = new Map();
    for (const report of reports) {
      this.reports.set(report.label, report);
    }
  }

  read(image: LabelImage): Promise<LabelReadingReport> {
    const report = this.reports.get(image.label);
    if (!report) {
      return Promise.reject(new Error(`stand-in reader has no pre-set read for label "${image.label}"`));
    }
    return Promise.resolve(report);
  }
}
