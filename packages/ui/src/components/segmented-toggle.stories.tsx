import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { SegmentedToggle, type SegmentedToggleOption } from "./segmented-toggle";

const OPTIONS: SegmentedToggleOption<string>[] = [
  { value: "weapon", label: "Weapon search" },
  { value: "armor", label: "My Armor" },
];

const onValueChange = fn();

const meta = {
  title: "Components/SegmentedToggle",
  component: SegmentedToggle,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  // Required props (the control is generic); the demo below owns the live state.
  args: { options: OPTIONS, value: "weapon", onValueChange },
} satisfies Meta<typeof SegmentedToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [value, setValue] = useState("weapon");
  return (
    <SegmentedToggle
      aria-label="Search mode"
      options={OPTIONS}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onValueChange(v);
      }}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };

export const SwitchesOnClick: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    onValueChange.mockClear();
    const canvas = within(canvasElement);
    const armor = canvas.getByRole("radio", { name: "My Armor" });
    await userEvent.click(armor);
    await expect(onValueChange).toHaveBeenCalledWith("armor");
    await expect(armor).toBeChecked();
  },
};

export const ArrowKeyNavigation: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    onValueChange.mockClear();
    const canvas = within(canvasElement);
    const weapon = canvas.getByRole("radio", { name: "Weapon search" });
    weapon.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(onValueChange).toHaveBeenCalledWith("armor");
    await expect(canvas.getByRole("radio", { name: "My Armor" })).toBeChecked();
  },
};
