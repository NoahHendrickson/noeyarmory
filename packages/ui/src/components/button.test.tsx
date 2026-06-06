import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { Button } from "./button";

test("renders children and forwards clicks", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Press</Button>);

  const button = screen.getByRole("button", { name: "Press" });
  expect(button).toBeInTheDocument();

  await userEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("applies variant + size classes", () => {
  render(
    <Button variant="secondary" size="sm">
      Styled
    </Button>,
  );
  const button = screen.getByRole("button", { name: "Styled" });
  expect(button.className).toContain("bg-secondary");
  expect(button.className).toContain("h-8");
});

test("renders as a different element via the render prop (Base UI composition)", () => {
  // The anchor's content is injected from the Button's children via the render prop.
  // eslint-disable-next-line jsx-a11y/anchor-has-content
  render(<Button render={<a href="/perks" />}>As link</Button>);
  const link = screen.getByRole("link", { name: "As link" });
  expect(link).toHaveAttribute("href", "/perks");
});
