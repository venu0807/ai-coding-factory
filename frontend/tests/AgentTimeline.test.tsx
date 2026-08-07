import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AgentTimeline from "../src/components/AgentTimeline";
import { authedFetch, getSupabase } from "../src/lib/supabase";

const mockProjectId = "proj-123";

beforeEach(() => {
  // Fix: mock subscribe to return a usable unsubscribe
  vi.mocked(getSupabase).mockResolvedValue({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    })),
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  } as any);
});

function createTasksResponse(data: any[]) {
  return new Response(JSON.stringify(data), { status: 200 });
}

describe("AgentTimeline", () => {
  it("shows waiting state when no tasks", async () => {
    vi.mocked(authedFetch).mockResolvedValueOnce(createTasksResponse([]));
    render(<AgentTimeline projectId={mockProjectId} />);
    expect(await screen.findByText(/waiting for agents/i)).toBeDefined();
  });

  it("renders agent tasks", async () => {
    vi.mocked(authedFetch).mockResolvedValueOnce(
      createTasksResponse([
        { id: "t1", agent_type: "requirements", status: "completed", logs: [] },
        { id: "t2", agent_type: "coding", status: "running", logs: [] },
      ]),
    );
    render(<AgentTimeline projectId={mockProjectId} />);
    expect(await screen.findByText("requirements agent")).toBeDefined();
    expect(await screen.findByText("coding agent")).toBeDefined();
  });

  it("shows status badges per agent", async () => {
    vi.mocked(authedFetch).mockResolvedValueOnce(
      createTasksResponse([
        { id: "t1", agent_type: "requirements", status: "completed", logs: [] },
        { id: "t2", agent_type: "coding", status: "running", logs: [] },
        { id: "t3", agent_type: "deployment", status: "failed", error: "Build timeout", logs: [] },
        { id: "t4", agent_type: "review", status: "pending", logs: [] },
      ]),
    );
    render(<AgentTimeline projectId={mockProjectId} />);
    expect(await screen.findByText("completed")).toBeDefined();
    expect(await screen.findByText("running")).toBeDefined();
    expect(await screen.findByText("failed")).toBeDefined();
    expect(await screen.findByText("pending")).toBeDefined();
  });

  it("shows error text for failed tasks", async () => {
    vi.mocked(authedFetch).mockResolvedValueOnce(
      createTasksResponse([
        { id: "t1", agent_type: "deployment", status: "failed", error: "Build timeout", logs: [] },
      ]),
    );
    render(<AgentTimeline projectId={mockProjectId} />);
    expect(await screen.findByText(/error:/i)).toBeDefined();
    expect(await screen.findByText(/build timeout/i)).toBeDefined();
  });

  it("shows retry button for failed tasks", async () => {
    vi.mocked(authedFetch).mockResolvedValueOnce(
      createTasksResponse([
        { id: "t1", agent_type: "deployment", status: "failed", error: "x", logs: [] },
      ]),
    );
    render(<AgentTimeline projectId={mockProjectId} />);
    const retryBtn = await screen.findByRole("button", { name: /retry/i });
    expect(retryBtn).toBeDefined();
  });

  it("shows progress bar for running tasks", async () => {
    vi.mocked(authedFetch).mockResolvedValueOnce(
      createTasksResponse([
        { id: "t1", agent_type: "coding", status: "running", logs: [] },
      ]),
    );
    render(<AgentTimeline projectId={mockProjectId} />);
    const bar = document.querySelector(".animate-pulse");
    expect(bar).toBeDefined();
  });

  it("shows log messages", async () => {
    const logs = [
      { timestamp: "t1", message: "Starting analysis..." },
      { timestamp: "t2", message: "Found 3 modules" },
    ];
    vi.mocked(authedFetch).mockResolvedValueOnce(
      createTasksResponse([
        { id: "t1", agent_type: "requirements", status: "completed", logs },
      ]),
    );
    render(<AgentTimeline projectId={mockProjectId} />);
    expect(await screen.findByText("Starting analysis...")).toBeDefined();
    expect(await screen.findByText("Found 3 modules")).toBeDefined();
  });

  it("reports file count in output", async () => {
    vi.mocked(authedFetch).mockResolvedValueOnce(
      createTasksResponse([
        { id: "t1", agent_type: "coding", status: "completed", output_data: { file_count: 5 }, logs: [] },
      ]),
    );
    render(<AgentTimeline projectId={mockProjectId} />);
    expect(await screen.findByText(/5 files generated/i)).toBeDefined();
  });

  it("handles fetch error gracefully", async () => {
    vi.mocked(authedFetch).mockRejectedValueOnce(new Error("Network error"));
    render(<AgentTimeline projectId={mockProjectId} />);
    expect(await screen.findByText(/failed to load tasks/i)).toBeDefined();
  });
});
