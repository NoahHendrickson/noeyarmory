import type { Meta, StoryObj } from "@storybook/react-vite";

import { FeedbackDialog } from "./feedback-dialog";

const meta = {
  title: "Components/FeedbackDialog",
  component: FeedbackDialog,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FeedbackDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Trigger: Story = {
  args: {},
};

export const FormBug: Story = {
  args: {
    defaultOpen: true,
    defaultType: "bug",
    hideTrigger: true,
  },
};

export const FormFeature: Story = {
  args: {
    defaultOpen: true,
    defaultType: "feature",
    hideTrigger: true,
  },
};

export const Success: Story = {
  args: {
    defaultOpen: true,
    defaultType: "bug",
    defaultSubmitState: "success",
    defaultIssueUrl: "https://github.com/example/repo/issues/1",
    hideTrigger: true,
  },
};
