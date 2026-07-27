import { useEffect, useState } from "react";
import { supabase, API_BASE } from "../lib/supabase";

interface Task {
  id: string; agent_type: string; status: string;
  input_data?: any; output_data?: any; error?: string;
  created_at: string; completed_at?: string;
}

export default function AgentTimeline({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = async () => {
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`);
    setTasks(await res.json());
  };

  useEffect(() => {
    load();
    const sub = supabase
      .channel("agent_tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_tasks" }, load)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [projectId]);

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
      {tasks.length === 0 && <p className="text-gray-400 text-sm">Waiting for agents...</p>}
      {tasks.map((t) => (
        <div key={t.id} className="border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium capitalize">{t.agent_type} agent</span>
            <span className={`text-xs px-2 py-1 rounded-full ${badge(t.status)}`}>{t.status}</span>
          </div>
          {t.status === "running" && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-2/3" />
            </div>
          )}
          {t.error && <p className="text-red-500 text-sm mt-1">Error: {t.error}</p>}
          {t.output_data?.file_count !== undefined && (
            <p className="text-green-600 text-sm mt-1">{t.output_data.file_count} files generated</p>
          )}
        </div>
      ))}
    </div>
  );
}