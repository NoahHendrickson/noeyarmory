import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { FilterChip } from "./filter-chip";

const meta = {
  title: "Components/FilterChip",
  component: FilterChip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { label: "Trait 1", value: "Bait and Switch", onRemove: fn() },
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoRemove: Story = { args: { onRemove: undefined } };

export const Draft: Story = { args: { value: undefined, onRemove: undefined } };

export const Removes: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /remove trait 1/i }));
    await expect(args.onRemove).toHaveBeenCalled();
  },
};
