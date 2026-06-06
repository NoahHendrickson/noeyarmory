import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Button } from "./button";

const meta = {
  title: "Components/Dialog",
  component: Dialog,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function Example() {
  return (
    <Dialog>
      <DialogTrigger render={<Button>Open dialog</Button>} />
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle className="text-lg font-semibold">Fatebringer</DialogTitle>
          <p className="text-muted-foreground mt-1 text-sm">Solar · Hand Cannon</p>
          <DialogClose render={<Button variant="secondary" className="mt-4" />}>Close</DialogClose>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

export const Default: Story = { render: () => <Example /> };

export const OpensAndCloses: Story = {
  render: () => <Example />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Dialog content renders in a portal on document.body, not within the canvas.
    const body = within(document.body);
    await userEvent.click(canvas.getByRole("button", { name: /open dialog/i }));
    await waitFor(() => expect(body.getByRole("dialog")).toBeInTheDocument());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};
