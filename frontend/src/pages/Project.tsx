import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getSupabase, authedFetch } from "../lib/supabase";
import { toast } from "../lib/toast";
import AgentTimeline from "../components/AgentTimeline";
import FileTree from "../components/FileTree";
import CodeReview from "../components/CodeReview";
import { TimelineSkeleton, FileTreeSkeleton } from "../components/Skeleton";

export default function Project() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    authedFetch(`/projects/${id}`)
      .then((r) => r.json())
      .then(setProject);
    let unsub: (() => void) | undefined;
    getSupabase().then((s) => {
      const sub = s
        .channel("projects")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "projects",
            filter: `id=eq.${id}`,
          },
          (p: any) => setProject(p.new),
        )
        .subscribe();
      unsub = () => sub.unsubscribe();
    });
    return () => unsub?.();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this project and all its data?")) return;
    setDeleting(true);
    try {
      await authedFetch(`/projects/${id}`, { method: "DELETE" });
      toast.success("Project deleted");
      navigate("/");
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  if (!project)
    return (
      <div className="max-w-6xl mx-auto p-6 pt-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimelineSkeleton />
          <FileTreeSkeleton />
        </div>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-6 pt-8">
      <Link to="/" className="text-green-600 text-sm mb-4 block">
        ← Back to projects
      </Link>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete project"}
        </button>
      </div>
      {project.description && (
        <p className="text-gray-500 mb-6">{project.description}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgentTimeline projectId={id!} />
        <FileTree
          projectId={id!}
          selectedPath={selectedFile}
          onSelect={setSelectedFile}
        />
      </div>

      <CodeReview projectId={id!} onFileClick={setSelectedFile} />
    </div>
  );
}
