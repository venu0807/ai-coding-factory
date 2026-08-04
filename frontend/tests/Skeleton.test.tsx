import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardSkeleton, TimelineSkeleton, FileTreeSkeleton } from "../src/components/Skeleton";

describe("Skeleton", () => {
  it("CardSkeleton renders", () => {
    const { container } = render(<CardSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeDefined();
  });

  it("TimelineSkeleton renders", () => {
    const { container } = render(<TimelineSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeDefined();
  });

  it("FileTreeSkeleton renders", () => {
    const { container } = render(<FileTreeSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeDefined();
  });
});
