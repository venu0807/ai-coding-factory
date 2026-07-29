import { useState } from "react";
import { authedFetch } from "../lib/supabase";
import { toast } from "../lib/toast";

export default function NewProjectForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const create = async () => {
    if (!name.trim()) {
      setFieldError("Project name is required");
      return;
    }
    setFieldError("");
    setLoading(true);
    try {
      await authedFetch("/projects", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      toast.success("Project created!");
      setName("");
      setDescription("");
      onCreated();
    } catch {
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4">New Project</h2>
      <input
        className="w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {fieldError && (
        <p className="text-red-500 text-xs mb-3">{fieldError}</p>
      )}
      <textarea
        className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        placeholder="Describe what you want to build..."
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button
        className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        disabled={loading || !name}
        onClick={create}
      >
        {loading ? "Generating..." : "Generate"}
      </button>
    </div>
  );
}
