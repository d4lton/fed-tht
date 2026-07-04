import { Button, Space, Typography, Upload } from "antd";
import type { ImageUpload } from "../api/types";

const LABELS = ["front", "back", "neck"] as const;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Strip the "data:...;base64," prefix — the backend wants raw base64.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("could not read the image file"));
    reader.readAsDataURL(file);
  });
}

/**
 * One upload slot per label (front / back / neck). Editing images replaces the
 * whole set, so whatever slots are filled here are the images that get saved.
 */
export function ImageUploader({
  value,
  onChange
}: {
  value: ImageUpload[];
  onChange: (images: ImageUpload[]) => void;
}) {
  async function setSlot(label: string, file: File | null): Promise<void> {
    const others = value.filter((image) => image.label !== label);
    if (!file) {
      onChange(others);
      return;
    }
    const data = await fileToBase64(file);
    onChange([...others, { label, data, mediaType: file.type || "image/png" }]);
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      {LABELS.map((label) => (
        <div key={label}>
          <Typography.Text style={{ display: "inline-block", width: 60 }}>
            {label}
          </Typography.Text>
          <Upload
            maxCount={1}
            accept="image/*"
            listType="picture"
            beforeUpload={(file) => {
              void setSlot(label, file);
              return false;
            }}
            onRemove={() => {
              void setSlot(label, null);
            }}
          >
            <Button>Select image</Button>
          </Upload>
        </div>
      ))}
    </Space>
  );
}
