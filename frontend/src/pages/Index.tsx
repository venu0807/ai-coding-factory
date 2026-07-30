import { useEffect, useState } from "react";
import { authedFetch } from "../lib/supabase";
import ProjectCard from "../components/ProjectCard";
import NewProjectForm from "../components/NewProjectForm";
import { CardSkeleton } from "../components/Skeleton";

const PAGE_SIZE = 20;

export default function Index() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const load = async () => {
    setLoading(true);
    setOffset(0);
    try {
      const res = await authedFetch("/projects?limit=" + PAGE_SIZE);
      const body = await res.json();
      setProjects(Array.isArray(body.data) ? body.data : []);
      setTotal(body.total || 0);
    } catch {
      setProjects([]);
    }
    setLoading(false);
  };

  const loadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const res = await authedFetch(`/projects?limit=${PAGE_SIZE}&offset=${nextOffset}`);
      const body = await res.json();
      const data = Array.isArray(body.data) ? body.data : [];
      setProjects((prev) => [...prev, ...data]);
      setOffset(nextOffset);
    } catch {
      // ignore
    }
    setLoadingMore(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = projects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto p-6 pt-8">
      <h1 className="text-3xl font-bold mb-2">AI Coding Factory</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Describe your idea, get production code.
      </p>
      <NewProjectForm onCreated={load} />

      {!loading && projects.length > 0 && (
        <input
          className="w-full border rounded-lg px-3 py-2 mb-4"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">
            {search ? "No matching projects" : "No projects yet"}
          </p>
          <p className="text-sm">
            {search
              ? "Try a different search term."
              : "Create your first project above to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p: any) => (
            <ProjectCard key={p.id} project={p} />
          ))}
          {!search && filtered.length > 0 && filtered.length < total && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-dashed rounded-lg hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500 disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : `Load more (${filtered.length}/${total})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
