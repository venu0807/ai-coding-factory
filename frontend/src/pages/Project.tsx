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
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fetchErr, setFetchErr] = useState(false);

  useEffect(() => {
    if (!id) return;
    setFetchErr(false);
    authedFetch(`/projects/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setProject)
      .catch(() => setFetchErr(true));
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

  const startEditing = () => {
    setEditName(project.name);
    setEditDesc(project.description || "");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const saveEditing = async () => {
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await authedFetch(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
        }),
      });
      const updated = await res.json();
      setProject(updated);
      setEditing(false);
      toast.success("Project updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (fetchErr)
    return (
      <div className="max-w-6xl mx-auto p-6 pt-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Project not found</h2>
        <p className="text-gray-500 text-sm mb-4">
          Could not load this project. It may have been deleted.
        </p>
        <Link to="/" className="text-green-600 text-sm hover:underline">
          ← Back to projects
        </Link>
      </div>
    );

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

      {editing ? (
        <div className="mb-6">
          <input
            className="w-full border rounded-lg px-3 py-2 mb-2 text-xl font-bold"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Project name"
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2 mb-2"
            rows={2}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optional)"
          />
          <div className="flex gap-2">
            <button
              onClick={saveEditing}
              disabled={saving}
              className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={cancelEditing}
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
            <h1 className="text-3xl font-bold break-all">{project.name}</h1>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={startEditing}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg border"
              >
                Edit
              </button>
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
        </>
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
