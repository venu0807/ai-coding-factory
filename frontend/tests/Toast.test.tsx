import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ToastContainer from "../src/components/Toast";
import { toast } from "../src/lib/toast";

describe("Toast", () => {
  it("renders toast message", async () => {
    render(<ToastContainer />);
    toast.success("Project created!");
    expect(await screen.findByText("Project created!")).toBeDefined();
  });

  it("renders error toast", async () => {
    render(<ToastContainer />);
    toast.error("Something failed");
    expect(await screen.findByText("Something failed")).toBeDefined();
  });

  it("renders info toast", async () => {
    render(<ToastContainer />);
    toast.info("Processing...");
    expect(await screen.findByText("Processing...")).toBeDefined();
  });

  it("shows multiple toasts", async () => {
    render(<ToastContainer />);
    toast.success("First");
    toast.error("Second");
    expect(await screen.findByText("First")).toBeDefined();
    expect(await screen.findByText("Second")).toBeDefined();
  });
});
