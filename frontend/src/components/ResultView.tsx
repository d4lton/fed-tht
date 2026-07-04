import { Alert, List, Tag, Typography } from "antd";
import type { CheckResult } from "../api/types";

/**
 * Shows a saved result: pass, or fail with each reason turned into readable
 * text (the short codes come from the result; the sentences come from the
 * code-to-text list served by the backend).
 */
export function ResultView({
  result,
  reasonTexts
}: {
  result: CheckResult;
  reasonTexts: Record<string, string>;
}) {
  const passed = result.outcome === "pass";
  return (
    <div>
      <Alert
        type={passed ? "success" : "error"}
        showIcon
        message={passed ? "Passed" : "Failed"}
        description={
          <Typography.Text type="secondary">
            Checked {new Date(result.ranAt).toLocaleString()} · took{" "}
            {result.tookMs} ms · read by {result.model}
          </Typography.Text>
        }
      />
      {!passed && (
        <List
          style={{ marginTop: 16 }}
          header={<Typography.Text strong>Reasons</Typography.Text>}
          bordered
          dataSource={result.reasons}
          renderItem={(reason) => (
            <List.Item>
              <div>
                <Tag color="red">{reason.id}</Tag>
                <span>{reasonTexts[reason.id] ?? reason.id}</span>
                {reason.expected !== undefined ? (
                  <div>
                    <Typography.Text type="secondary">
                      expected “{reason.expected}”, found “{reason.found}”
                    </Typography.Text>
                  </div>
                ) : (
                  reason.found !== undefined && (
                    <div>
                      <Typography.Text type="secondary">read: “{reason.found}”</Typography.Text>
                    </div>
                  )
                )}
                {reason.labels.length > 0 && (
                  <div>
                    <Typography.Text type="secondary">
                      on: {reason.labels.join(", ")}
                    </Typography.Text>
                  </div>
                )}
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
