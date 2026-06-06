import type { Meta, StoryObj } from "@storybook/react-vite";

import { Kbd } from "./kbd";

const meta = {
  title: "Components/Kbd",
  component: Kbd,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { children: "Enter" },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Hints: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Kbd>Tab</Kbd>
      <Kbd>Enter ⏎</Kbd>
      <Kbd>Esc</Kbd>
    </div>
  ),
};
