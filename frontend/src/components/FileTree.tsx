import { useEffect, useState } from "react";
import { API_BASE } from "../lib/supabase";

interface GenFile {
  id: string; file_path: string; content: string; language?: string;
}

export default function FileTree({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<GenFile[]>([]);
  const [selected, setSelected] = useState<GenFile | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${API_BASE}/projects/${projectId}/files`);
      setFiles(await res.json());
    };
    load();
  }, [projectId]);

  if (files.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Generated Files</h2>
      <div className="flex gap-4">
        <div className="w-64 shrink-0">
          {files.map((f) => (
            <button
              key={f.id}
              className={`block w-full text-left px-3 py-1.5 text-sm rounded ${
                selected?.id === f.id ? "bg-green-100 text-green-700" : "hover:bg-gray-100"
              }`}
              onClick={() => setSelected(f)}
            >
              {f.file_path}
            </button>
          ))}
        </div>
        {selected && (
          <div className="flex-1">
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-sm"><code>{selected.content}</code></pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}