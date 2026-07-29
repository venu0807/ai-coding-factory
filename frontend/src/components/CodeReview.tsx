import { useEffect, useState } from "react";
import { authedFetch } from "../lib/supabase";

interface Finding {
  file: string;
  line: number | null;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion: string;
}

interface Review {
  summary?: string;
  findings: Finding[];
}

export default function CodeReview({
  projectId,
  onFileClick,
}: {
  projectId: string;
  onFileClick?: (path: string) => void;
}) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authedFetch(`/projects/${projectId}/tasks`);
        const tasks = await res.json();
        const reviewTask = tasks.find(
          (t: any) =>
            t.agent_type === "code_review" && t.status === "completed",
        );
        if (reviewTask?.output_data?.review) {
          setReview(reviewTask.output_data.review);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) return null;
  if (!review || !review.findings?.length) return null;

  const severityBg = (s: string) =>
    s === "error"
      ? "bg-red-50"
      : s === "warning"
        ? "bg-amber-50"
        : "bg-blue-50";

  const severityIcon = (s: string) =>
    s === "error" ? "🔴" : s === "warning" ? "🟡" : "🔵";

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3">Code Review</h2>
      {review.summary && (
        <p className="text-sm text-gray-500 mb-3">{review.summary}</p>
      )}
      <div className="space-y-2">
        {review.findings.map((f, i) => (
          <div
            key={i}
            className={`rounded-lg p-3 ${severityBg(f.severity)}`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {f.message}
                </p>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  {f.file && (
                    <button
                      className="text-blue-600 hover:underline truncate"
                      onClick={() => onFileClick?.(f.file)}
                    >
                      {f.file}
                      {f.line ? `:${f.line}` : ""}
                    </button>
                  )}
                </div>
                {f.suggestion && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Suggestion: {f.suggestion}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
