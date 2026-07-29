import { useEffect, useState } from "react";
import { authedFetch } from "../lib/supabase";
import ProjectCard from "../components/ProjectCard";
import NewProjectForm from "../components/NewProjectForm";
import { CardSkeleton } from "../components/Skeleton";

export default function Index() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/projects");
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    }
    setLoading(false);
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
      <p className="text-gray-500 mb-8">
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
        </div>
      )}
    </div>
  );
}
