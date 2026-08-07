import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../src/components/ErrorBoundary";

const ThrowComponent = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) throw new Error("Test error");
  return <div>Safe content</div>;
};

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Safe content")).toBeDefined();
  });

  it("catches errors and shows fallback", () => {
    // Suppress console.error from React for expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Test error")).toBeDefined();
    expect(screen.getByText("Try again")).toBeDefined();
    spy.mockRestore();
  });

  it("uses custom fallback when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowComponent shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom error UI")).toBeDefined();
    spy.mockRestore();
  });
});
