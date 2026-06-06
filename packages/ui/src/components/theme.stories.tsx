import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Theme/Palette",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`border-border h-16 w-full rounded-lg border ${className}`} />
      <span className="text-muted-foreground text-xs">{name}</span>
    </div>
  );
}

/** The warm-dark Figma palette surfaced as theme tokens. */
export const Colors: Story = {
  render: () => (
    <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
      <Swatch name="background" className="bg-background" />
      <Swatch name="card / popover" className="bg-card" />
      <Swatch name="primary (#58c26c)" className="bg-primary" />
      <Swatch name="warning" className="bg-warning" />
      <Swatch name="muted" className="bg-muted" />
      <Swatch name="accent (row hover)" className="bg-accent" />
      <Swatch name="border" className="bg-border" />
      <Swatch name="destructive" className="bg-destructive" />
    </div>
  ),
};

/** Foreground text tones over the canvas. */
export const Text: Story = {
  render: () => (
    <div className="space-y-2">
      <p className="text-foreground text-sm">foreground — primary text</p>
      <p className="text-muted-foreground text-sm">muted-foreground — hints &amp; placeholders</p>
      <p className="text-primary text-sm">primary — accent / links</p>
    </div>
  ),
};
