import { useCallback, useEffect, useState } from "react";
import {
  App as AntApp,
  Button,
  Card,
  Descriptions,
  Form,
  Image,
  Modal,
  Space,
  Spin
} from "antd";
import { useParams } from "react-router-dom";
import { ApplicationForm } from "../components/ApplicationForm";
import { ImageUploader } from "../components/ImageUploader";
import { ResultView } from "../components/ResultView";
import { ValidatingModal } from "../components/ValidatingModal";
import {
  getApplication,
  getReasonTexts,
  imageUrl,
  updateDetails,
  updateImages
} from "../api/applications";
import type {
  ApplicationDetailsInput,
  ApplicationView,
  ImageUpload
} from "../api/types";

export function ApplicationDetailPage() {
  const { id = "" } = useParams();
  const [application, setApplication] = useState<ApplicationView | null>(null);
  const [reasonTexts, setReasonTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [newImages, setNewImages] = useState<ImageUpload[]>([]);
  const [form] = Form.useForm<ApplicationDetailsInput>();
  const { message } = AntApp.useApp();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setApplication(await getApplication(id));
    } catch {
      message.error("Could not load the application.");
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    void refresh();
    void getReasonTexts().then(setReasonTexts);
  }, [refresh]);

  async function saveDetails(): Promise<void> {
    const values = await form.validateFields();
    setEditOpen(false);
    setValidating(true);
    try {
      setApplication(await updateDetails(id, values));
    } catch {
      message.error("Could not save.");
    } finally {
      setValidating(false);
    }
  }

  async function saveImages(): Promise<void> {
    if (newImages.length === 0) {
      message.warning("Add at least one image.");
      return;
    }
    setImagesOpen(false);
    setValidating(true);
    try {
      setApplication(await updateImages(id, newImages));
      setNewImages([]);
    } catch {
      message.error("Could not save the images.");
    } finally {
      setValidating(false);
    }
  }

  if (loading || !application) {
    return <Spin />;
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => setEditOpen(true)}>Edit details</Button>
        <Button onClick={() => setImagesOpen(true)}>Replace images</Button>
      </Space>

      <Descriptions bordered column={1} title="Application">
        <Descriptions.Item label="Brand">{application.brand}</Descriptions.Item>
        <Descriptions.Item label="Drink type">
          {application.drinkType}
        </Descriptions.Item>
        <Descriptions.Item label="Name and address">
          {application.nameAndAddress}
        </Descriptions.Item>
        <Descriptions.Item label="Origin">
          {application.importedOrDomestic}
        </Descriptions.Item>
      </Descriptions>

      <Card title="Label images" style={{ marginTop: 16 }}>
        {application.images.length === 0 ? (
          <span>No images yet — use “Replace images” to add them.</span>
        ) : (
          <Space wrap>
            {application.images.map((image) => (
              <div key={image.label} style={{ textAlign: "center" }}>
                <Image
                  width={120}
                  src={imageUrl(application.id, image.label)}
                  alt={image.label}
                />
                <div>{image.label}</div>
              </div>
            ))}
          </Space>
        )}
      </Card>

      <Card title="Result" style={{ marginTop: 16 }}>
        {application.result ? (
          <ResultView result={application.result} reasonTexts={reasonTexts} />
        ) : (
          <span>Not checked yet.</span>
        )}
      </Card>

      <Modal
        title="Edit details"
        open={editOpen}
        okText="Save"
        destroyOnHidden
        onOk={() => void saveDetails()}
        onCancel={() => setEditOpen(false)}
      >
        <ApplicationForm form={form} initial={application} />
      </Modal>

      <Modal
        title="Replace images"
        open={imagesOpen}
        okText="Save"
        destroyOnHidden
        onOk={() => void saveImages()}
        onCancel={() => setImagesOpen(false)}
      >
        <ImageUploader value={newImages} onChange={setNewImages} />
      </Modal>

      <ValidatingModal open={validating} />
    </div>
  );
}
