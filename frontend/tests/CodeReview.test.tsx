import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CodeReview from "../src/components/CodeReview";
import { authedFetch } from "../src/lib/supabase";

const mockFetch = vi.fn();
window.fetch = mockFetch;

describe("CodeReview", () => {
  beforeEach(() => {
    vi.mocked(authedFetch).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
  });

  it("renders nothing when no review completed", async () => {
    render(<CodeReview projectId="p1" />);
    // should not render heading
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("Code Review")).toBeNull();
  });

  it("renders findings from completed review task", async () => {
    const tasks = [
      {
        id: "t1",
        agent_type: "code_review",
        status: "completed",
        output_data: {
          review: {
            summary: "Found 2 issues",
            findings: [
              {
                file: "src/main.ts",
                line: 42,
                severity: "error",
                message: "Missing input validation",
                suggestion: "Add zod schema",
              },
              {
                file: "src/utils.ts",
                line: null,
                severity: "warning",
                message: "Unused variable",
                suggestion: "Remove it",
              },
            ],
          },
        },
      },
    ];
    vi.mocked(authedFetch).mockResolvedValue(
      new Response(JSON.stringify(tasks), { status: 200 }),
    );
    render(<CodeReview projectId="p1" />);
    expect(await screen.findByText("Code Review")).toBeDefined();
    expect(await screen.findByText("Found 2 issues")).toBeDefined();
    expect(await screen.findByText("Missing input validation")).toBeDefined();
    expect(await screen.findByText("Unused variable")).toBeDefined();
    expect(await screen.findByText(/src\/main.ts:42/)).toBeDefined();
  });

  it("renders info severity findings", async () => {
    const tasks = [
      {
        id: "t1",
        agent_type: "code_review",
        status: "completed",
        output_data: {
          review: {
            findings: [
              {
                file: "a.ts",
                line: 1,
                severity: "info",
                message: "Style nitpick",
                suggestion: "Consider using const",
              },
            ],
          },
        },
      },
    ];
    vi.mocked(authedFetch).mockResolvedValue(
      new Response(JSON.stringify(tasks), { status: 200 }),
    );
    render(<CodeReview projectId="p1" />);
    expect(await screen.findByText("Style nitpick")).toBeDefined();
    expect(await screen.findByText(/Consider using const/)).toBeDefined();
  });

  it("calls onFileClick when file path clicked", async () => {
    const onFileClick = vi.fn();
    const tasks = [
      {
        id: "t1",
        agent_type: "code_review",
        status: "completed",
        output_data: {
          review: {
            findings: [
              { file: "src/app.ts", line: 10, severity: "error", message: "Bug", suggestion: "Fix" },
            ],
          },
        },
      },
    ];
    vi.mocked(authedFetch).mockResolvedValue(
      new Response(JSON.stringify(tasks), { status: 200 }),
    );
    render(<CodeReview projectId="p1" onFileClick={onFileClick} />);
    const fileBtn = await screen.findByText(/src\/app.ts/);
    fileBtn.click();
    expect(onFileClick).toHaveBeenCalledWith("src/app.ts");
  });
});
