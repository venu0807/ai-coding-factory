import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Signup from "../src/pages/Signup";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Signup", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it("renders signup form", () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /sign up/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/Email/)).toBeDefined();
    expect(screen.getByPlaceholderText(/Password/)).toBeDefined();
  });

  it("shows strength bar when typing password", async () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );
    const pw = screen.getByPlaceholderText(/Password/);
    await userEvent.type(pw, "weak");
    expect(await screen.findByText("Weak")).toBeDefined();
  });

  it("shows strong for complex password", async () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );
    const pw = screen.getByPlaceholderText(/Password/);
    await userEvent.type(pw, "Str0ng!Pass!");
    expect(await screen.findByText("Strong")).toBeDefined();
  });
});
