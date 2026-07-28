import { useEffect, useState } from "react";
import { authedFetch } from "../lib/supabase";
import ProjectCard from "../components/ProjectCard";
import NewProjectForm from "../components/NewProjectForm";

export default function Index() {
  const [projects, setProjects] = useState<any[]>([]);

  const load = async () => {
    try {
      const res = await authedFetch("/projects");
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">AI Coding Factory</h1>
      <p className="text-gray-500 mb-8">Describe your idea, get production code.</p>
      <NewProjectForm onCreated={load} />
      <div className="grid gap-4">
        {projects.map((p: any) => <ProjectCard key={p.id} project={p} />)}
      </div>
    </div>
  );
}