import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { FilterChip } from "./filter-chip";

function ElementPlaceholder() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <circle cx="8" cy="8" r="5" fill="currentColor" />
    </svg>
  );
}

const meta = {
  title: "Components/FilterChip",
  component: FilterChip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { label: "Trait 1", value: "Bait and Switch", onRemove: fn() },
  decorators: [
    (Story) => (
      <div className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoRemove: Story = { args: { onRemove: undefined } };
export const Draft: Story = { args: { value: undefined, onRemove: undefined } };

export const TraitTone: Story = {
  args: { tone: "trait", label: "Trait 1", value: "Bait and Switch" },
};

export const AmmoSpecialTone: Story = {
  args: { tone: "ammo-special", label: "Ammo type", value: "Special" },
};

export const AmmoHeavyTone: Story = {
  args: { tone: "ammo-heavy", label: "Ammo type", value: "Heavy" },
};

export const ElementIconOnly: Story = {
  args: {
    tone: "element",
    element: "Arc",
    label: "Element",
    value: "Arc",
    hideLabel: true,
    valueIcon: <ElementPlaceholder />,
  },
};

export const Removes: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /remove trait 1/i }));
    await expect(args.onRemove).toHaveBeenCalled();
  },
};
