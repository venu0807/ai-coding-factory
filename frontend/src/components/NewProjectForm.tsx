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
    if (name.trim().length > 100) {
      setFieldError("Max 100 characters");
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
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-700 p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4 dark:text-gray-100">New Project</h2>
      <input
        className="w-full border rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        placeholder="Project name"
        value={name}
        maxLength={100}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && create()}
      />
      {fieldError && (
        <p className="text-red-500 text-xs mb-3">{fieldError}</p>
      )}
      <textarea
        className="w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        placeholder="Describe what you want to build..."
        rows={3}
        maxLength={500}
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
