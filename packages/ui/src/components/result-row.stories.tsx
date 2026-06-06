import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ResultRow } from "./result-row";
import { Badge } from "./badge";

const meta = {
  title: "Components/ResultRow",
  component: ResultRow,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { title: "Fatebringer", subtitle: "Solar · Hand Cannon", onClick: fn() },
  render: (args) => (
    <div className="w-80">
      <ResultRow {...args} />
    </div>
  ),
} satisfies Meta<typeof ResultRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithIconAndTrailing: Story = {
  args: {
    icon: <span className="bg-primary/30 size-7 rounded" />,
    trailing: <Badge variant="secondary">Energy</Badge>,
  },
};

export const AsLink: Story = {
  args: {
    // ResultRow injects the title/subtitle as the anchor's content.
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    render: <a href="/weapon/123" />,
  },
};

export const Clicks: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /fatebringer/i }));
    await expect(args.onClick).toHaveBeenCalled();
  },
};
