import { LabelReadingReport } from "../types";
import { aggregate } from "./aggregate";

describe("aggregate", () => {
  it("treats a field found on any label as present across the union", () => {
    const reports: LabelReadingReport[] = [
      { label: "front", fields: [{ field: "warning", state: "absent" }] },
      {
        label: "back",
        fields: [
          {
            field: "warning",
            state: "found",
            text: "GOVERNMENT WARNING: ...",
            basis: "confirmed"
          }
        ]
      }
    ];
    const info = aggregate(reports);
    const warning = info.byField.warning;
    expect(warning?.found.map((o) => o.label)).toEqual(["back"]);
    expect(warning?.absentLabels).toEqual(["front"]);
  });
  it("carries every found observation so first-found never silently wins", () => {
    const reports: LabelReadingReport[] = [
      {
        label: "front",
        fields: [{ field: "brand", state: "found", text: "A", basis: "confirmed" }]
      },
      {
        label: "back",
        fields: [{ field: "brand", state: "found", text: "B", basis: "confirmed" }]
      }
    ];
    const info = aggregate(reports);
    expect(info.byField.brand?.found).toEqual([
      { label: "front", text: "A", basis: "confirmed" },
      { label: "back", text: "B", basis: "confirmed" }
    ]);
  });
  it("keeps unreadable distinct from absent", () => {
    const reports: LabelReadingReport[] = [{ label: "front", fields: [{ field: "warning", state: "unreadable" }] }];
    const info = aggregate(reports);
    expect(info.byField.warning?.unreadableLabels).toEqual(["front"]);
    expect(info.byField.warning?.absentLabels).toEqual([]);
  });
  it("records label IDs in first-seen order", () => {
    const reports: LabelReadingReport[] = [
      { label: "front", fields: [] },
      { label: "back", fields: [] }
    ];
    expect(aggregate(reports).labels).toEqual(["front", "back"]);
  });
});
