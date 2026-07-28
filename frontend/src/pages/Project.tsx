import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getSupabase, authedFetch } from "../lib/supabase";
import AgentTimeline from "../components/AgentTimeline";
import FileTree from "../components/FileTree";

export default function Project() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    authedFetch(`/projects/${id}`).then((r) => r.json()).then(setProject);
    let unsub: (() => void) | undefined;
    getSupabase().then((s) => {
      const sub = s
        .channel("projects")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects", filter: `id=eq.${id}` }, (p: any) => setProject(p.new))
        .subscribe();
      unsub = () => sub.unsubscribe();
    });
    return () => unsub?.();
  }, [id]);

  if (!project) return <div className="p-6 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Link to="/" className="text-green-600 text-sm mb-4 block">← Back to projects</Link>
      <h1 className="text-3xl font-bold mb-1">{project.name}</h1>
      {project.description && <p className="text-gray-500 mb-6">{project.description}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgentTimeline projectId={id!} />
        <FileTree projectId={id!} />
      </div>
    </div>
  );
}