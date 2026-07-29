import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getSupabase, authedFetch, API_BASE } from "../lib/supabase";
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
  const [downloading, setDownloading] = useState(false);
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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const s = await getSupabase();
      const token = (await s.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/projects/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${id!.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded!");
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
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
      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
        <h1 className="text-3xl font-bold break-all">{project.name}</h1>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {downloading ? "Downloading..." : "Download ZIP"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
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
