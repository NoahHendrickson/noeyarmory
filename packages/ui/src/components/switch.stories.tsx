import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { Switch } from "./switch";

const onCheckedChange = fn();

const meta = {
  title: "Components/Switch",
  component: Switch,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { "aria-label": "Notifications", onCheckedChange },
  decorators: [
    (Story) => (
      <div className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <Switch
      aria-label="Notifications"
      checked={checked}
      onCheckedChange={(next) => {
        setChecked(next);
        onCheckedChange(next);
      }}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };

export const Checked: Story = { render: () => <Demo defaultChecked /> };

export const Disabled: Story = {
  args: { disabled: true, checked: true, "aria-label": "Notifications" },
};

export const WithLabel: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Switch
          checked={checked}
          onCheckedChange={(next) => {
            setChecked(next);
            onCheckedChange(next);
          }}
        />
        Background animation
      </label>
    );
  },
};

export const TogglesOnClick: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    onCheckedChange.mockClear();
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("switch", { name: "Notifications" });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await userEvent.click(toggle);
    await expect(onCheckedChange).toHaveBeenCalledWith(true);
    await expect(toggle).toHaveAttribute("aria-checked", "true");
  },
};
