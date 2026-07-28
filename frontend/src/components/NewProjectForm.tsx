import { useState } from "react";
import { authedFetch } from "../lib/supabase";

export default function NewProjectForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const create = async () => {
    setLoading(true);
    await authedFetch("/projects", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
    setLoading(false);
    setName("");
    setDescription("");
    onCreated();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4">New Project</h2>
      <input
        className="w-full border rounded-lg px-3 py-2 mb-3"
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        className="w-full border rounded-lg px-3 py-2 mb-3"
        placeholder="Describe what you want to build..."
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button
        className="bg-brand-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        disabled={loading || !name}
        onClick={create}
      >
        {loading ? "Creating..." : "Generate"}
      </button>
    </div>
  );
}