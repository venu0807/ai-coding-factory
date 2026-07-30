import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "../src/lib/ThemeContext";

function TestToggle() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle}>{theme === "dark" ? "dark" : "light"}</button>;
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to light theme", () => {
    render(
      <ThemeProvider>
        <TestToggle />
      </ThemeProvider>,
    );
    expect(screen.getByText("light")).toBeDefined();
  });

  it("toggles theme on button click", async () => {
    render(
      <ThemeProvider>
        <TestToggle />
      </ThemeProvider>,
    );
    const btn = screen.getByRole("button");
    await userEvent.click(btn);
    expect(screen.getByText("dark")).toBeDefined();
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("persists theme in localStorage", () => {
    localStorage.setItem("theme", "dark");
    render(
      <ThemeProvider>
        <TestToggle />
      </ThemeProvider>,
    );
    expect(screen.getByText("dark")).toBeDefined();
  });
});
