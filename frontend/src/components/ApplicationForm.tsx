import { Form, Input, Radio, Select } from "antd";
import type { FormInstance } from "antd";
import type { ApplicationDetailsInput } from "../api/types";

const DRINK_TYPE_OPTIONS = [
  { value: "distilled-spirits", label: "Distilled spirits" },
  { value: "wine", label: "Wine" },
  { value: "malt-beverage", label: "Malt beverage" }
];

const ORIGIN_OPTIONS = [
  { value: "domestic", label: "Domestic" },
  { value: "imported", label: "Imported" }
];

/** The details form — used for both creating and editing an application. */
export function ApplicationForm({
  form,
  initial
}: {
  form: FormInstance<ApplicationDetailsInput>;
  initial?: Partial<ApplicationDetailsInput>;
}) {
  return (
    <Form form={form} layout="vertical" initialValues={initial}>
      <Form.Item name="drinkType" label="Drink type" rules={[{ required: true }]}>
        <Select options={DRINK_TYPE_OPTIONS} />
      </Form.Item>
      <Form.Item name="brand" label="Brand" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item
        name="nameAndAddress"
        label="Name and address"
        rules={[{ required: true }]}
      >
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item
        name="importedOrDomestic"
        label="Origin"
        rules={[{ required: true }]}
      >
        <Radio.Group options={ORIGIN_OPTIONS} />
      </Form.Item>
    </Form>
  );
}
