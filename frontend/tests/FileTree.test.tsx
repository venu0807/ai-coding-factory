import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileTree from "../src/components/FileTree";

function file(path: string, content = "hello world", language?: string) {
  return { id: path, file_path: path, content, language };
}

describe("FileTree", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // vitest + happy-dom: innerHTML available
  });

  it("shows empty state", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([])));
    render(<FileTree projectId="p1" />);
    expect(await screen.findByText(/No files generated/i)).toBeDefined();
  });

  it("renders file list", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([file("src/main.ts"), file("src/utils.ts")])),
    );
    render(<FileTree projectId="p1" />);
    expect(await screen.findByText("src/main.ts")).toBeDefined();
    expect(await screen.findByText("src/utils.ts")).toBeDefined();
  });

  it("shows file content on click", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([file("hello.ts", "console.log('hi')", "ts")])),
    );
    render(<FileTree projectId="p1" />);
    const btn = await screen.findByText("hello.ts");
    await userEvent.click(btn);
    const codeEl = document.querySelector("code");
    expect(codeEl?.textContent).toContain("console.log");
  });

  it("highlights selected file", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([file("a.ts"), file("b.ts")])),
    );
    render(<FileTree projectId="p1" />);
    const btn = await screen.findByText("a.ts");
    await userEvent.click(btn);
    expect(btn.className).toContain("bg-green-100");
  });

  it("calls onSelect when file clicked", async () => {
    const onSelect = vi.fn();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([file("x.ts")])),
    );
    render(<FileTree projectId="p1" onSelect={onSelect} />);
    const btn = await screen.findByText("x.ts");
    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith("x.ts");
  });

  it("handles fetch error gracefully", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fail"));
    render(<FileTree projectId="p1" />);
    // component catches and just shows empty state
    expect(await screen.findByText(/No files generated/i)).toBeDefined();
  });
});
