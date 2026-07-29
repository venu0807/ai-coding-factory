import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewProjectForm from "../src/components/NewProjectForm";
import { authedFetch } from "../src/lib/supabase";
import { toast } from "../src/lib/toast";

import ToastContainer from "../src/components/Toast";

describe("NewProjectForm", () => {
  beforeEach(() => {
    vi.mocked(authedFetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "p1" }), { status: 200 }),
    );
  });

  it("renders form fields", () => {
    render(<NewProjectForm onCreated={vi.fn()} />);
    expect(screen.getByPlaceholderText("Project name")).toBeDefined();
    expect(
      screen.getByPlaceholderText("Describe what you want to build..."),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /generate/i })).toBeDefined();
  });

  it("disables button when name empty", () => {
    render(<NewProjectForm onCreated={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /generate/i });
    expect(btn).toBeDisabled();
  });

  it("enables button when name filled", async () => {
    render(<NewProjectForm onCreated={vi.fn()} />);
    await userEvent.type(
      screen.getByPlaceholderText("Project name"),
      "My App",
    );
    expect(screen.getByRole("button", { name: /generate/i })).not.toBeDisabled();
  });

  it("shows error toast on failed create", async () => {
    vi.mocked(authedFetch).mockRejectedValueOnce(new Error("fail"));
    render(
      <>
        <NewProjectForm onCreated={vi.fn()} />
        <ToastContainer />
      </>,
    );
    await userEvent.type(
      screen.getByPlaceholderText("Project name"),
      "Test",
    );
    await userEvent.click(screen.getByRole("button", { name: /generate/i }));
    expect(await screen.findByText(/Failed to create/i)).toBeDefined();
  });

  it("shows success toast on create", async () => {
    const onCreated = vi.fn();
    render(
      <>
        <NewProjectForm onCreated={onCreated} />
        <ToastContainer />
      </>,
    );
    await userEvent.type(
      screen.getByPlaceholderText("Project name"),
      "My App",
    );
    await userEvent.click(screen.getByRole("button", { name: /generate/i }));
    expect(await screen.findByText(/Project created!/i)).toBeDefined();
    expect(onCreated).toHaveBeenCalled();
  });

  it("clears fields after successful create", async () => {
    render(<NewProjectForm onCreated={vi.fn()} />);
    const nameInput = screen.getByPlaceholderText("Project name");
    await userEvent.type(nameInput, "My App");
    await userEvent.click(screen.getByRole("button", { name: /generate/i }));
    expect((nameInput as HTMLInputElement).value).toBe("");
  });

  it("disables button while loading", async () => {
    vi.mocked(authedFetch).mockImplementationOnce(
      () =>
        new Promise((r) =>
          setTimeout(
            () => r(new Response('{"id":"p1"}', { status: 200 })),
            100,
          ),
        ),
    );
    render(<NewProjectForm onCreated={vi.fn()} />);
    await userEvent.type(
      screen.getByPlaceholderText("Project name"),
      "App",
    );
    const btn = screen.getByRole("button", { name: /generate/i });
    await userEvent.click(btn);
    // after click, button should be disabled during loading
    await new Promise((r) => setTimeout(r, 10));
    expect(btn).toBeDisabled();
  });
});
