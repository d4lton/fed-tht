import { Modal, Spin } from "antd";

/**
 * The "validating…" dialog. Because saving runs the check on the backend,
 * saving takes a few seconds; this makes that work visible.
 */
export function ValidatingModal({ open }: { open: boolean }) {
  return (
    <Modal open={open} footer={null} closable={false} maskClosable={false}>
      <div style={{ textAlign: "center", padding: 24 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Validating…</div>
      </div>
    </Modal>
  );
}
