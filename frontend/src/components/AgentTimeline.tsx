import { useEffect, useState, useRef } from "react";
import { getSupabase, authedFetch } from "../lib/supabase";

interface Task {
  id: string;
  agent_type: string;
  status: string;
  input_data?: any;
  output_data?: any;
  error?: string;
  logs?: Array<{ timestamp: string; message: string }>;
  created_at: string;
  completed_at?: string;
}

export default function AgentTimeline({
  projectId,
}: {
  projectId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const res = await authedFetch(`/projects/${projectId}/tasks`);
    setTasks(await res.json());
  };

  useEffect(() => {
    load();
    let unsub: (() => void) | undefined;
    getSupabase().then((s) => {
      const sub = s
        .channel("agent_tasks")
        .on("postgres_changes", { event: "*", schema: "public", table: "agent_tasks" }, load)
        .subscribe();
      unsub = () => sub.unsubscribe();
    });
    return () => unsub?.();
  }, [projectId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tasks]);

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
      {tasks.length === 0 && (
        <div className="text-gray-400 text-sm flex items-center gap-2">
          <span className="animate-pulse">●</span>
          <span className="animate-pulse" style={{ animationDelay: "0.15s" }}>●</span>
          <span className="animate-pulse" style={{ animationDelay: "0.3s" }}>●</span>
          <span className="ml-1">Waiting for agents...</span>
        </div>
      )}
      {tasks.map((t) => (
        <div key={t.id} className="border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium capitalize">
              {t.agent_type} agent
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full ${badge(t.status)}`}
            >
              {t.status}
            </span>
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
            <div className="mt-2 bg-gray-50 rounded p-2 max-h-32 overflow-y-auto text-xs font-mono space-y-0.5">
              {t.logs.map((l, i) => (
                <div key={i} className="text-gray-600">
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
