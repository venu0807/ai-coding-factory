import { useEffect, useState } from "react";
import { API_BASE } from "../lib/supabase";

interface GenFile {
  id: string;
  file_path: string;
  content: string;
  language?: string;
}

const langKeywords: Record<string, RegExp> = {
  ts: /\b(function|const|let|var|return|import|export|if|else|for|while|class|interface|type|async|await|default|new|throw|try|catch|extends|implements|from|of|in|keyof|typeof)\b/g,
  tsx: /\b(function|const|let|var|return|import|export|if|else|for|while|class|interface|type|async|await|default|new|throw|try|catch|extends|implements|from|of|in|keyof|typeof)\b/g,
  py: /\b(def|class|import|from|if|elif|else|for|while|return|yield|async|await|try|except|raise|with|as|pass|break|continue|True|False|None|self)\b/g,
  js: /\b(function|const|let|var|return|import|export|if|else|for|while|class|async|await|default|new|throw|try|catch)\b/g,
  jsx: /\b(function|const|let|var|return|import|export|if|else|for|while|class|async|await|default|new|throw|try|catch)\b/g,
  go: /\b(func|package|import|if|else|for|range|return|var|const|type|struct|interface|map|chan|go|defer|select|case|switch|break|continue)\b/g,
  rs: /\b(fn|let|mut|return|if|else|for|while|match|struct|enum|impl|trait|use|mod|pub|async|await|let|mut|ref|match|Some|None|Ok|Err)\b/g,
};

function highlightCode(code: string, language?: string): string {
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const kw =
    langKeywords[language || ""] ||
    /\b(function|const|let|var|return|import|export|if|else|for|while|class|def|from|async|await|import|export|default|new|throw|try|catch)\b/g;

  return escaped.replace(
    /(\/\/[^\n]*|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|(\b(?:function|const|let|var|return|import|export|if|else|for|while|class|def|from|async|await|import|export|default|new|throw|try|catch)\b))/g,
    (match, comment, dq, sq, num, kwMatch) => {
      if (comment?.startsWith("//")) return `<span class="hl-comment">${match}</span>`;
      if (dq) return `<span class="hl-string">${match}</span>`;
      if (sq) return `<span class="hl-string">${match}</span>`;
      if (num) return `<span class="hl-number">${match}</span>`;
      if (kwMatch) return `<span class="hl-keyword">${match}</span>`;
      return match;
    },
  );
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 shrink-0 focus-visible:outline-2 focus-visible:outline-green-400"
      aria-label={copied ? "Copied to clipboard" : "Copy file content"}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function DownloadButton({ projectId, fileId, filename }: { projectId: string; fileId: string; filename: string }) {
  const handleDownload = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/files/${fileId}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };
  return (
    <button
      onClick={handleDownload}
      className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 shrink-0 focus-visible:outline-2 focus-visible:outline-green-400"
      aria-label={`Download ${filename}`}
    >
      ⬇
    </button>
  );
}

export default function FileTree({
  projectId,
  selectedPath,
  onSelect,
}: {
  projectId: string;
  selectedPath?: string | null;
  onSelect?: (path: string) => void;
}) {
  const [files, setFiles] = useState<GenFile[]>([]);
  const [selected, setSelected] = useState<GenFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/projects/${projectId}/files`);
        setFiles(await res.json());
      } catch {
        // Network error — component shows empty state
      }
      setLoading(false);
    };
    load();
  }, [projectId]);

  useEffect(() => {
    if (selectedPath && !selected) {
      const match = files.find((f) => f.file_path === selectedPath);
      if (match) setSelected(match);
    }
  }, [selectedPath, files, selected]);

  if (loading)
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">Generated Files</h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
          ))}
        </div>
      </div>
    );

  if (files.length === 0)
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">Generated Files</h2>
        <p className="text-gray-400 text-sm">No files generated yet.</p>
      </div>
    );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Generated Files</h2>
      <input
        className="w-full border rounded-lg px-2 py-1.5 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        placeholder="Search files..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-64 shrink-0 max-h-48 sm:max-h-96 overflow-y-auto">
          {files.filter((f) => !search || f.file_path.toLowerCase().includes(search.toLowerCase())).map((f) => (
            <button
              key={f.id}
              className={`block w-full text-left px-3 py-1.5 text-sm rounded truncate focus-visible:outline-2 focus-visible:outline-green-500 ${
                selected?.id === f.id
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => {
                setSelected(f);
                onSelect?.(f.file_path);
              }}
              aria-label={`Select file ${f.file_path}`}
            >
              {f.file_path}
            </button>
          ))}
        </div>
        {selected && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-gray-500 truncate">{selected.file_path}</span>
              <div className="flex gap-1">
                <DownloadButton projectId={projectId} fileId={selected.id} filename={selected.file_path.split("/").pop() || "file"} />
                <CopyButton content={selected.content} />
              </div>
            </div>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-sm">
                <code
                  dangerouslySetInnerHTML={{
                    __html: highlightCode(
                      selected.content,
                      selected.language,
                    ),
                  }}
                />
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
