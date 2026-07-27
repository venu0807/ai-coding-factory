import { Link } from "react-router-dom";

interface Project {
  id: string; name: string; description?: string; status: string; created_at: string;
}

export default function ProjectCard({ project }: { project: Project }) {
  const statusColor =
    project.status === "completed" ? "text-green-600" :
    project.status === "running" ? "text-blue-600" : "text-gray-400";

  return (
    <Link to={`/project/${project.id}`} className="block bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{project.name}</h3>
        <span className={`text-sm ${statusColor}`}>{project.status}</span>
      </div>
      {project.description && (
        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{project.description}</p>
      )}
      <p className="text-xs text-gray-400 mt-2">{new Date(project.created_at).toLocaleDateString()}</p>
    </Link>
  );
}