import { useEffect, useState, useRef } from "react";
import { getSupabase, authedFetch } from "../lib/supabase";
import { toast } from "../lib/toast";
import type { AgentTask } from "../lib/types";

export default function AgentTimeline({
  projectId,
}: {
  projectId: string;
}) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [fetchErr, setFetchErr] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setFetchErr(false);
    try {
      const res = await authedFetch(`/projects/${projectId}/tasks`);
      setTasks(await res.json());
    } catch {
      setFetchErr(true);
    }
  };

  useEffect(() => {
    load();
    let unsub: (() => void) | undefined;
    getSupabase().then((s) => {
      const sub = s
        .channel("agent_tasks")
        .on("postgres_changes", { event: "*", schema: "public", table: "agent_tasks" }, (payload: any) => {
          // Incremental update — merge changed task into state without full reload
          if (payload.eventType === "INSERT") {
            setTasks((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) => prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t)));
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        })
        .subscribe();
      unsub = () => sub.unsubscribe();
    });
    return () => unsub?.();
  }, [projectId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tasks]);

  const handleRetry = async (taskId: string) => {
    setRetrying(taskId);
    try {
      await authedFetch(`/projects/${projectId}/tasks/${taskId}/retry`, { method: "POST" });
      toast.success("Task queued for retry");
      load();
    } catch {
      toast.error("Retry failed");
    } finally {
      setRetrying(null);
    }
  };

  const badge = (status: string) => {
    const m: Record<string, string> = {
      pending: "bg-gray-100 text-gray-600",
      running: "bg-blue-100 text-blue-700 animate-pulse",
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
    };
    return m[status] || m.pending;
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Agent Pipeline</h2>
      {fetchErr && (
        <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded-lg p-4 text-center">
          <p className="text-red-600 dark:text-red-400 text-sm mb-2">Failed to load tasks</p>
          <button onClick={load} className="text-sm text-blue-600 hover:underline">
            Retry
          </button>
        </div>
      )}
      {!fetchErr && tasks.length === 0 && (
        <div className="text-gray-400 text-sm flex items-center gap-2">
          <span className="animate-pulse">●</span>
          <span className="animate-pulse" style={{ animationDelay: "0.15s" }}>●</span>
          <span className="animate-pulse" style={{ animationDelay: "0.3s" }}>●</span>
          <span className="ml-1">Waiting for agents...</span>
        </div>
      )}
      {tasks.map((t) => (
        <div key={t.id} className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium capitalize dark:text-gray-100">
              {t.agent_type} agent
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${badge(t.status)}`}>
                {t.status}
              </span>
              {t.status === "failed" && (
                <button
                  onClick={() => handleRetry(t.id)}
                  disabled={retrying === t.id}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {retrying === t.id ? "..." : "Retry"}
                </button>
              )}
            </div>
          </div>
          {t.status === "running" && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
              <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-2/3" />
            </div>
          )}
          {t.error && (
            <p className="text-red-500 text-sm mt-1">Error: {t.error}</p>
          )}
          {t.output_data?.file_count !== undefined && (
            <p className="text-green-600 text-sm mt-1">
              {t.output_data.file_count} files generated
            </p>
          )}
          {t.output_data?.review?.findings && (
            <p className="text-blue-600 text-sm mt-1">
              {t.output_data.review.findings.length} review findings
            </p>
          )}
          {t.logs && t.logs.length > 0 && (
            <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded p-2 max-h-32 overflow-y-auto text-xs font-mono space-y-0.5">
              {t.logs.map((l, i) => (
                <div key={i} className="text-gray-600 dark:text-gray-400">
                  {l.message}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
