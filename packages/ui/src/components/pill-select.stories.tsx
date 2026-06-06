import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { PillSelect, type PillSelectOption } from "./pill-select";

const OPTIONS: PillSelectOption<string>[] = [
  { value: "weapon", label: "Weapons mode" },
  { value: "armor", label: "Armor mode" },
];

const onValueChange = fn();

const meta = {
  title: "Components/PillSelect",
  component: PillSelect,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { options: OPTIONS, value: "weapon", onValueChange },
} satisfies Meta<typeof PillSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [value, setValue] = useState("weapon");
  return (
    <PillSelect
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

export const SwitchesOnSelect: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    onValueChange.mockClear();
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Search mode" }));
    const armor = await within(document.body).findByRole("menuitem", { name: "Armor mode" });
    await userEvent.click(armor);
    await expect(onValueChange).toHaveBeenCalledWith("armor");
    await expect(canvas.getByRole("button", { name: "Search mode" })).toHaveTextContent(
      "Armor mode",
    );
  },
};
