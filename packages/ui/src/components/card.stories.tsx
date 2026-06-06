import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  title: "Components/Card",
  component: Card,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Fatebringer</CardTitle>
        <CardDescription>Hand Cannon · Arc</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        An Adaptive Frame hand cannon from the Vault of Glass.
      </CardContent>
      <CardFooter>
        <Button size="sm">View perks</Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Fatebringer")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /view perks/i })).toBeInTheDocument();
  },
};
