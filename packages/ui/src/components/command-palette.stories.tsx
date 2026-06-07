import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import {
  CommandPalette,
  type PaletteCategory,
  type PaletteChip,
  type PaletteValueOption,
} from "./command-palette";
import { type FilterChipElement, type FilterChipTone } from "./filter-chip";
import { Badge } from "./badge";
import { ResultRow } from "./result-row";

const VALUES: Record<string, PaletteValueOption[]> = {
  trait1: [
    { id: "firefly", label: "Firefly", hint: "12" },
    { id: "explosive", label: "Explosive Payload", hint: "7", dimmed: true },
  ],
  trait2: [{ id: "surrounded", label: "Surrounded", hint: "24" }],
  element: [
    { id: "arc", label: "Arc", hint: "42" },
    { id: "solar", label: "Solar", hint: "38" },
    { id: "void", label: "Void", hint: "30" },
  ],
};

const match = (key: string) => (q: string) =>
  VALUES[key]!.filter((v) => v.label.toLowerCase().includes(q.toLowerCase()));

const CATEGORIES: PaletteCategory[] = [
  {
    id: "trait1",
    label: "Trait 1",
    single: true,
    examples: '"Firefly" "Explosive Payload"',
    getValues: match("trait1"),
  },
  { id: "trait2", label: "Trait 2", single: true, examples: '"Surrounded"', getValues: match("trait2") },
  { id: "element", label: "Element", examples: '"Arc" "Solar"', getValues: match("element") },
  { id: "slot", label: "Slot", examples: '"Energy" "Kinetic"', getValues: () => [] },
];

const meta = {
  title: "Components/CommandPalette",
  component: CommandPalette,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    placeholder: "Press F to search",
    categories: CATEGORIES,
    chips: [],
    query: "",
    onQueryChange: fn(),
    onAddChip: fn(),
    onRemoveChip: fn(),
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<PaletteChip[]>([]);
  return (
    <CommandPalette
      placeholder="Press F to search"
      categories={CATEGORIES}
      chips={chips}
      query={query}
      onQueryChange={setQuery}
      onAddChip={(categoryId, option) => {
        const category = CATEGORIES.find((c) => c.id === categoryId)!;
        setChips((prev) => [
          ...prev.filter((c) => !(c.categoryId === categoryId && c.valueId === option.id)),
          {
            id: `${categoryId}:${option.id}`,
            categoryId,
            categoryLabel: category.label,
            value: option.label,
            valueId: option.id,
          },
        ]);
      }}
      onRemoveChip={(id) => setChips((prev) => prev.filter((c) => c.id !== id))}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };

function ElementPlaceholder({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <title>{label}</title>
      <circle cx="8" cy="8" r="5" fill="currentColor" />
    </svg>
  );
}

function storyChipAppearance(categoryId: string, value: string) {
  if (categoryId === "trait1" || categoryId === "trait2") {
    return { tone: "trait" as FilterChipTone };
  }
  if (categoryId === "ammo") {
    if (value === "Special") return { tone: "ammo-special" as FilterChipTone };
    if (value === "Heavy") return { tone: "ammo-heavy" as FilterChipTone };
  }
  if (categoryId === "element") {
    return {
      tone: "element" as FilterChipTone,
      element: value as FilterChipElement,
      hideLabel: true,
      valueIcon: <ElementPlaceholder label={value} />,
    };
  }
  return { tone: "default" as FilterChipTone };
}

export const ColoredChips: Story = {
  render: () => (
    <CommandPalette
      placeholder="Press F to search"
      categories={CATEGORIES}
      chips={[
        {
          id: "trait1:bas",
          categoryId: "trait1",
          categoryLabel: "Trait 1",
          value: "Bait and Switch",
          valueId: "bas",
        },
        {
          id: "ammo:special",
          categoryId: "ammo",
          categoryLabel: "Ammo type",
          value: "Special",
          valueId: "special",
        },
        {
          id: "ammo:heavy",
          categoryId: "ammo",
          categoryLabel: "Ammo type",
          value: "Heavy",
          valueId: "heavy",
        },
        {
          id: "element:arc",
          categoryId: "element",
          categoryLabel: "Element",
          value: "Arc",
          valueId: "arc",
        },
        {
          id: "type:fusion",
          categoryId: "type",
          categoryLabel: "Weapon type",
          value: "Fusion rifle",
          valueId: "fusion",
        },
      ]}
      query=""
      onQueryChange={() => {}}
      onAddChip={() => {}}
      onRemoveChip={() => {}}
      getChipAppearance={(chip) => storyChipAppearance(chip.categoryId, chip.value)}
    />
  ),
};

export const DisabledWithOverlay: Story = {
  render: () => (
    <CommandPalette
      categories={[]}
      chips={[]}
      query=""
      onQueryChange={() => {}}
      onAddChip={() => {}}
      onRemoveChip={() => {}}
      disabled
      renderBarOverlay={
        <Badge variant="warning">Reconnect your bungie account ↗</Badge>
      }
    />
  ),
};

export const DrillsAndAddsChipByMouse: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    await waitFor(() => expect(canvas.getByRole("option", { name: /Trait 1/ })).toBeInTheDocument());
    await userEvent.click(canvas.getByRole("option", { name: /Trait 1/ }));
    await waitFor(() => expect(canvas.getByRole("option", { name: /Firefly/ })).toBeInTheDocument());
    await userEvent.click(canvas.getByRole("option", { name: /Firefly/ }));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /remove trait 1/i })).toBeInTheDocument(),
    );
  },
};

export const KeyboardDrillAndAdd: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("combobox");
    await userEvent.click(input);
    await waitFor(() => expect(canvas.getByRole("option", { name: /Trait 1/ })).toBeInTheDocument());
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByRole("option", { name: /Firefly/ })).toBeInTheDocument());
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /remove trait 1/i })).toBeInTheDocument(),
    );
  },
};

export const BackspaceRemovesLastChip: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("combobox");
    await userEvent.click(input);
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByRole("option", { name: /Firefly/ })).toBeInTheDocument());
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /remove trait 1/i })).toBeInTheDocument(),
    );
    await userEvent.keyboard("{Backspace}");
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: /remove trait 1/i })).toBeNull(),
    );
  },
};

export const TypingNarrowsCategories: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    await userEvent.type(canvas.getByRole("combobox"), "slot");
    await waitFor(() => {
      expect(canvas.getByRole("option", { name: /Slot/ })).toBeInTheDocument();
      expect(canvas.queryByRole("option", { name: /Trait 1/ })).toBeNull();
      expect(canvas.queryByRole("option", { name: /Element/ })).toBeNull();
    });
  },
};

export const HidesFullSingleSelectCategory: Story = {
  render: () => {
    const [query, setQuery] = useState("");
    const [chips, setChips] = useState<PaletteChip[]>([
      {
        id: "trait1:firefly",
        categoryId: "trait1",
        categoryLabel: "Trait 1",
        value: "Firefly",
        valueId: "firefly",
      },
    ]);
    return (
      <CommandPalette
        placeholder="Press F to search"
        categories={CATEGORIES}
        chips={chips}
        query={query}
        onQueryChange={setQuery}
        onAddChip={(categoryId, option) => {
          const category = CATEGORIES.find((c) => c.id === categoryId)!;
          setChips((prev) => [
            ...prev,
            {
              id: `${categoryId}:${option.id}`,
              categoryId,
              categoryLabel: category.label,
              value: option.label,
              valueId: option.id,
            },
          ]);
        }}
        onRemoveChip={(id) => setChips((prev) => prev.filter((c) => c.id !== id))}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("combobox");
    await userEvent.click(input);
    await userEvent.type(input, "surr");
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: /Trait 2.*Surrounded/i })).toBeInTheDocument(),
    );
    expect(canvas.queryByRole("option", { name: /Trait 1.*Surrounded/i })).toBeNull();
  },
};

export const TypingPerkValueSuggestsChip: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("combobox");
    await userEvent.click(input);
    await userEvent.type(input, "surr");
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: /Trait 2.*Surrounded/i })).toBeInTheDocument(),
    );
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /remove trait 2/i })).toBeInTheDocument(),
    );
  },
};

export const ClearsQueryOnCategorySelect: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    await userEvent.type(canvas.getByRole("combobox"), "ele");
    await waitFor(() => expect(canvas.getByRole("option", { name: /Element/ })).toBeInTheDocument());
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByRole("combobox")).toHaveValue(""));
  },
};

export const TabMovesSelection: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    await waitFor(() => expect(canvas.getByRole("option", { name: /Trait 1/ })).toBeInTheDocument());
    // Trait 1 is active first; Tab moves to Trait 2.
    await userEvent.keyboard("{Tab}");
    const trait2Option = canvas.getByRole("option", { name: /Trait 2/ });
    await expect(trait2Option).toHaveAttribute("aria-selected", "true");
  },
};

export const DraftChipWhileDrilling: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(canvas.getByLabelText(/filtering by trait 1/i)).toBeInTheDocument(),
    );
    const chipInput = canvasElement.querySelector('[data-slot="filter-chip-input"]');
    expect(chipInput).toBeTruthy();
    expect(canvas.getByRole("combobox")).toBe(chipInput);
    await expect(chipInput).toHaveAttribute("placeholder", "Firefly");
  },
};

export const DraftChipWhisperFollowsHighlight: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(canvas.getByLabelText(/filtering by trait 1/i)).toBeInTheDocument(),
    );
    const chipInput = canvas.getByRole("combobox");
    await expect(chipInput).toHaveAttribute("placeholder", "Firefly");
    await userEvent.keyboard("{Tab}");
    await waitFor(() => expect(chipInput).toHaveAttribute("placeholder", "Explosive Payload"));
    await userEvent.hover(canvas.getByRole("option", { name: /Firefly/ }));
    await waitFor(() => expect(chipInput).toHaveAttribute("placeholder", "Firefly"));
  },
};

export const TypesInsideDraftChip: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() =>
      expect(canvas.getByLabelText(/filtering by trait 2/i)).toBeInTheDocument(),
    );
    const chipInput = canvas.getByRole("combobox");
    await userEvent.type(chipInput, "ramp");
    await waitFor(() => expect(chipInput).toHaveValue("ramp"));
    expect(chipInput.closest('[data-slot="filter-chip"]')).toBeTruthy();
  },
};

function ResultsDemo() {
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<PaletteChip[]>([
    {
      id: "trait1:firefly",
      categoryId: "trait1",
      categoryLabel: "Trait 1",
      value: "Firefly",
      valueId: "firefly",
    },
  ]);
  return (
    <CommandPalette
      placeholder="Press F to search"
      categories={CATEGORIES}
      chips={chips}
      query={query}
      onQueryChange={setQuery}
      showResults
      results={[
        {
          id: "1",
          content: (
            <ResultRow render={<div />} title="Fatebringer" subtitle="Solar · Hand Cannon" />
          ),
        },
        {
          id: "2",
          content: (
            <ResultRow render={<div />} title="Palindrome" subtitle="Void · Hand Cannon" />
          ),
        },
      ]}
      onSelectResult={fn()}
      onAddChip={(categoryId, option) => {
        const category = CATEGORIES.find((c) => c.id === categoryId)!;
        setChips((prev) => [
          ...prev,
          {
            id: `${categoryId}:${option.id}`,
            categoryId,
            categoryLabel: category.label,
            value: option.label,
            valueId: option.id,
          },
        ]);
      }}
      onRemoveChip={(id) => setChips((prev) => prev.filter((c) => c.id !== id))}
    />
  );
}

export const ShowsResultsAfterChip: Story = {
  render: () => <ResultsDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    await waitFor(() =>
      expect(canvas.getByRole("option", { name: /Fatebringer/ })).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(canvas.queryByRole("option", { name: /Trait 1/ })).toBeNull(),
    );
  },
};
