import { useCallback, useEffect, useState } from "react";
import {
  App as AntApp,
  Button,
  Empty,
  Form,
  Modal,
  Table,
  Tag,
  Typography
} from "antd";
import type { TableColumnsType } from "antd";
import { useNavigate } from "react-router-dom";
import { ApplicationForm } from "../components/ApplicationForm";
import { ImageUploader } from "../components/ImageUploader";
import { ValidatingModal } from "../components/ValidatingModal";
import {
  createApplication,
  listApplications,
  updateImages
} from "../api/applications";
import type {
  ApplicationDetailsInput,
  ApplicationSummary,
  ImageUpload,
  Outcome
} from "../api/types";

const columns: TableColumnsType<ApplicationSummary> = [
  { title: "Brand", dataIndex: "brand", key: "brand" },
  { title: "Drink type", dataIndex: "drinkType", key: "drinkType" },
  { title: "Origin", dataIndex: "importedOrDomestic", key: "origin" },
  {
    title: "Status",
    dataIndex: "outcome",
    key: "status",
    render: (outcome: Outcome | null) =>
      outcome ? (
        <Tag color={outcome === "pass" ? "green" : "red"}>{outcome}</Tag>
      ) : (
        <Tag>unchecked</Tag>
      )
  },
  {
    title: "Last checked",
    dataIndex: "ranAt",
    key: "ranAt",
    render: (ranAt: string | null) =>
      ranAt ? new Date(ranAt).toLocaleString() : "—"
  }
];

export function ApplicationsPage() {
  const [rows, setRows] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [images, setImages] = useState<ImageUpload[]>([]);
  const [form] = Form.useForm<ApplicationDetailsInput>();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listApplications());
    } catch {
      message.error("Could not load applications.");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitCreate(): Promise<void> {
    const values = await form.validateFields();
    setCreateOpen(false);
    setValidating(true);
    try {
      const created = await createApplication(values);
      if (images.length > 0) {
        await updateImages(created.id, images);
      }
      form.resetFields();
      setImages([]);
      navigate(`/applications/${created.id}`);
    } catch {
      message.error("Could not save the application.");
    } finally {
      setValidating(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Applications
        </Typography.Title>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          Add Application
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        onRow={(row) => ({
          onClick: () => navigate(`/applications/${row.id}`),
          style: { cursor: "pointer" }
        })}
        locale={{
          emptyText: (
            <Empty description="No applications yet — add one to get started." />
          )
        }}
      />

      <Modal
        title="Add application"
        open={createOpen}
        okText="Save"
        destroyOnHidden
        onOk={() => void submitCreate()}
        onCancel={() => setCreateOpen(false)}
      >
        <ApplicationForm
          form={form}
          initial={{ drinkType: "distilled-spirits", importedOrDomestic: "domestic" }}
        />
        <Typography.Text strong>Label images</Typography.Text>
        <ImageUploader value={images} onChange={setImages} />
      </Modal>

      <ValidatingModal open={validating} />
    </div>
  );
}
