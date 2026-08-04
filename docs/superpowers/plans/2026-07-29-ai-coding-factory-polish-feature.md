# UX Polish + Code Review Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish frontend UX (toasts, navbar, skeletons, validation, error boundary, highlighting, delete) and add Code Review Agent to pipeline.

**Architecture:** Frontend-first polish in 7 self-contained tasks, then Code Review Agent backend + UI. Each task independently testable.

**Tech Stack:** React 19 + Vite + Tailwind v4 (frontend), Python FastAPI + Supabase + OmniRouter (backend), Vitest + Testing Library (tests)

## Global Constraints

- Tailwind v4 (`@tailwindcss/vite` plugin, NO PostCSS config)
- `brand-500` = `#22c55e` (green)
- No new npm dependencies — use built-in React + CSS
- No new Python dependencies — use existing httpx + supabase-py
- Code Review agent uses same `BaseAgent.call_llm()` pattern as other agents
- All agent outputs stored as JSON in `agent_tasks.output_data`
- Prefer `datetime.now(timezone.utc).isoformat()` — never raw `"now()"` strings

---

### Task 1: Toast Notification System

**Files:**
- Create: `frontend/src/components/Toast.tsx`
- Create: `frontend/src/lib/toast.ts`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: React state management (useState)
- Produces: `toast.show(message, type)` function + `<ToastContainer />` rendered in App

- [ ] **Step 1: Create toast state lib**

Write `frontend/src/lib/toast.ts`:

```typescript
type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];
let nextId = 0;

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

export const toast = {
  show(message: string, type: ToastType = "info") {
    const id = nextId++;
    toasts = [...toasts, { id, message, type }];
    notify();
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }, 4000);
  },
  success: (msg: string) => toast.show(msg, "success"),
  error: (msg: string) => toast.show(msg, "error"),
  info: (msg: string) => toast.show(msg, "info"),
};

export function subscribe(fn: (toasts: Toast[]) => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
```

- [ ] **Step 2: Create Toast component**

Write `frontend/src/components/Toast.tsx`:

```tsx
import { useEffect, useState } from "react";
import { subscribe, type Toast as ToastType } from "../lib/toast";

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  useEffect(() => {
    const unsub = subscribe(setToasts);
    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded-lg shadow-lg text-white text-sm animate-slide-in ${
            t.type === "success" ? "bg-green-600" :
            t.type === "error" ? "bg-red-600" : "bg-gray-700"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Add slide-in animation and render in App**

Modify `frontend/src/index.css` — add after `@import "tailwindcss";`:

```css
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.animate-slide-in { animation: slide-in 0.25s ease-out; }
```

Modify `frontend/src/App.tsx` — import and render `<ToastContainer />` inside `<BrowserRouter>`:

```tsx
import ToastContainer from "./components/Toast";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer />
        <Routes>...</Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Test toast renders**

Create `frontend/tests/Toast.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ToastContainer from "../src/components/Toast";
import { toast } from "../src/lib/toast";

it("renders toast message", () => {
  render(<ToastContainer />);
  toast.success("Project created!");
  expect(screen.getByText("Project created!")).toBeTruthy();
});
```

- [ ] **Step 5: Run tests + commit**

```bash
cd frontend && npx vitest run tests/Toast.test.tsx 2>&1 | tail -5
git add frontend/src/lib/toast.ts frontend/src/components/Toast.tsx frontend/src/index.css frontend/src/App.tsx frontend/tests/Toast.test.tsx
git commit -m "feat: add toast notification system"
```

---

### Task 2: Navbar with Auth State

**Files:**
- Create: `frontend/src/components/Navbar.tsx`
- Modify: `frontend/src/lib/AuthContext.tsx`
- Modify: `frontend/src/lib/auth.ts`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `AuthContext` (updated), `toast`
- Produces: `<Navbar />` rendered on all pages

- [ ] **Step 1: Wire real auth state into AuthContext**

Update `frontend/src/lib/AuthContext.tsx` — load session on mount, wire signOut:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSupabase } from './supabase';

interface AuthCtx {
  user: { id: string; email?: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupabase().then((s) => {
      s.auth.getSession().then(({ data: { session } }: any) => {
        if (session?.user) setUser({ id: session.user.id, email: session.user.email });
        setLoading(false);
      });
      const { data: { subscription } } = s.auth.onAuthStateChange((_event: string, session: any) => {
        if (session?.user) setUser({ id: session.user.id, email: session.user.email });
        else setUser(null);
      });
      return () => subscription.unsubscribe();
    });
  }, []);

  const signOut = async () => {
    const s = await getSupabase();
    await s.auth.signOut();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 2: Create Navbar component**

Write `frontend/src/components/Navbar.tsx`:

```tsx
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Navbar() {
  const { user, loading, signOut } = useAuth();

  return (
    <nav className="border-b bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-brand-500">AI Coding Factory</Link>
        <div className="flex items-center gap-4">
          {loading ? (
            <span className="text-sm text-gray-400">Loading...</span>
          ) : user ? (
            <>
              <span className="text-sm text-gray-600">{user.email}</span>
              <button onClick={signOut} className="text-sm text-red-500 hover:text-red-700">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-600 hover:text-gray-800">Sign in</Link>
              <Link to="/signup" className="text-sm bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Render Navbar in App**

Modify `frontend/src/App.tsx` — add `<Navbar />` inside `<BrowserRouter>` before Routes:

```tsx
import Navbar from "./components/Navbar";

// Inside BrowserRouter:
<Navbar />
<Routes>...</Routes>
```

Add top padding to page containers (in each page's wrapper div, `pt-4` or adjust). Update Index.tsx max-w-4xl → max-w-6xl to match.

- [ ] **Step 4: Test auth context**

Update `frontend/tests/App.test.tsx` to verify navbar renders:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../src/App";

it("renders navbar brand", () => {
  render(<App />);
  expect(screen.getByText("AI Coding Factory")).toBeTruthy();
});
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Navbar.tsx frontend/src/lib/AuthContext.tsx frontend/src/lib/auth.ts frontend/src/App.tsx frontend/tests/App.test.tsx
git commit -m "feat: add navbar with auth state"
```

---

### Task 3: Loading Skeletons + Empty States

**Files:**
- Create: `frontend/src/components/Skeleton.tsx`
- Modify: `frontend/src/pages/Index.tsx`
- Modify: `frontend/src/pages/Project.tsx`
- Modify: `frontend/src/components/AgentTimeline.tsx`
- Modify: `frontend/src/components/FileTree.tsx`

- [ ] **Step 1: Create Skeleton component**

Write `frontend/src/components/Skeleton.tsx`:

```tsx
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function FileTreeSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-1/2" />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update Index page with skeleton + empty state**

Modify `frontend/src/pages/Index.tsx`:

```tsx
import { CardSkeleton } from "../components/Skeleton";

// Inside component:
const [loading, setLoading] = useState(true);

const load = async () => {
  setLoading(true);
  // ... existing fetch ...
  setLoading(false);
};

// Replace grid:
{loading ? (
  <div className="grid gap-4">
    {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
  </div>
) : projects.length === 0 ? (
  <div className="text-center py-12 text-gray-500">
    <p className="text-lg mb-2">No projects yet</p>
    <p className="text-sm">Create your first project above to get started.</p>
  </div>
) : (
  <div className="grid gap-4">
    {projects.map((p: any) => <ProjectCard key={p.id} project={p} />)}
  </div>
)}
```

- [ ] **Step 3: Update Project page with skeletons**

Modify `frontend/src/pages/Project.tsx` — replace bare "Loading..." with skeleton grid:

```tsx
import { TimelineSkeleton, FileTreeSkeleton } from "../components/Skeleton";

// Replace loading div:
if (!project) return (
  <div className="max-w-6xl mx-auto p-6">
    <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" />
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-6 animate-pulse" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TimelineSkeleton />
      <FileTreeSkeleton />
    </div>
  </div>
);
```

- [ ] **Step 4: Update AgentTimeline empty state**

Modify `frontend/src/components/AgentTimeline.tsx` — replace text with animated dots:

```tsx
{tasks.length === 0 && (
  <div className="text-gray-400 text-sm flex items-center gap-2">
    <span className="animate-pulse">●</span>
    <span className="animate-pulse delay-150">●</span>
    <span className="animate-pulse delay-300">●</span>
    <span className="ml-1">Waiting for agents...</span>
  </div>
)}
```

- [ ] **Step 5: Update FileTree empty state**

Modify `frontend/src/components/FileTree.tsx` — show message instead of `return null`:

```tsx
if (files.length === 0) return (
  <div>
    <h2 className="text-lg font-semibold mb-3">Generated Files</h2>
    <p className="text-gray-400 text-sm">No files generated yet.</p>
  </div>
);
```

- [ ] **Step 6: Test + commit**

```bash
git add frontend/src/components/Skeleton.tsx frontend/src/pages/Index.tsx frontend/src/pages/Project.tsx frontend/src/components/AgentTimeline.tsx frontend/src/components/FileTree.tsx
git commit -m "feat: add loading skeletons and empty states"
```

---

### Task 4: Form Validation

**Files:**
- Modify: `frontend/src/pages/Login.tsx`
- Modify: `frontend/src/pages/Signup.tsx`
- Modify: `frontend/src/components/NewProjectForm.tsx`

- [ ] **Step 1: Add validation to Login**

Modify `frontend/src/pages/Login.tsx` — add field-level validation:

```tsx
const [fieldErrors, setFieldErrors] = useState<{email?: string; password?: string}>({});

const validate = () => {
  const errors: typeof fieldErrors = {};
  if (!email.includes("@")) errors.email = "Enter a valid email";
  if (password.length < 6) errors.password = "Min 6 characters";
  setFieldErrors(errors);
  return Object.keys(errors).length === 0;
};

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setError("");
  if (!validate()) return;
  // ... existing signIn ...
};

// After each input, add error message:
{fieldErrors.email && <p className="text-red-500 text-xs -mt-3 mb-2">{fieldErrors.email}</p>}
{fieldErrors.password && <p className="text-red-500 text-xs -mt-3 mb-2">{fieldErrors.password}</p>}
```

- [ ] **Step 2: Add validation to Signup** (same pattern as Login)

- [ ] **Step 3: Add validation to NewProjectForm**

Modify `frontend/src/components/NewProjectForm.tsx`:

```tsx
const [fieldError, setFieldError] = useState("");

const create = async () => {
  if (!name.trim()) {
    setFieldError("Project name is required");
    return;
  }
  // ... existing create ...
  setFieldError("");
};

// After input:
{fieldError && <p className="text-red-500 text-xs -mt-2 mb-3">{fieldError}</p>}
```

- [ ] **Step 4: Test + commit**

```bash
git add frontend/src/pages/Login.tsx frontend/src/pages/Signup.tsx frontend/src/components/NewProjectForm.tsx
git commit -m "feat: add form validation"
```

---

### Task 5: Error Boundary

**Files:**
- Create: `frontend/src/components/ErrorBoundary.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create ErrorBoundary component**

Write `frontend/src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Wrap routes in App.tsx**

Modify `frontend/src/App.tsx`:

```tsx
import ErrorBoundary from "./components/ErrorBoundary";

// In Routes:
<Route path="/" element={<ErrorBoundary><Index /></ErrorBoundary>} />
<Route path="/project/:id" element={<ErrorBoundary><Project /></ErrorBoundary>} />
// ... other routes
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ErrorBoundary.tsx frontend/src/App.tsx
git commit -m "feat: add error boundary"
```

---

### Task 6: Syntax Highlighting in FileTree

**Files:**
- Modify: `frontend/src/components/FileTree.tsx`

No new dependencies. Use simple CSS token highlighting.

- [ ] **Step 1: Highlight component**

Modify `frontend/src/components/FileTree.tsx` — add `highlightCode` function:

```typescript
function highlightCode(code: string, language?: string): string {
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Simple keyword highlighting
  const keywords = langKeywords[language || ""] || /\b(function|const|let|var|return|import|export|if|else|for|while|class|def|from|async|await|import|export|default|new|throw|try|catch)\b/g;

  return escaped.replace(
    /(\/\/[^\n]*|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|(\b(?:function|const|let|var|return|import|export|if|else|for|while|class|def|from|async|await|import|export|default|new|throw|try|catch)\b))/g,
    (match, comment, dq, sq, num, kw) => {
      if (comment?.startsWith("//")) return `<span class="hl-comment">${match}</span>`;
      if (dq) return `<span class="hl-string">${match}</span>`;
      if (sq) return `<span class="hl-string">${match}</span>`;
      if (num) return `<span class="hl-number">${match}</span>`;
      if (kw) return `<span class="hl-keyword">${match}</span>`;
      return match;
    }
  );
}

const langKeywords: Record<string, RegExp> = {
  ts: /\b(function|const|let|var|return|import|export|if|else|for|while|class|interface|type|async|await|import|export|default|new|throw|try|catch|extends|implements|from|of|in|keyof|typeof)\b/g,
  py: /\b(def|class|import|from|if|elif|else|for|while|return|yield|async|await|try|except|raise|with|as|pass|break|continue|True|False|None|self)\b/g,
  js: /\b(function|const|let|var|return|import|export|if|else|for|while|class|async|await|import|export|default|new|throw|try|catch)\b/g,
};
```

- [ ] **Step 2: Add CSS and use highlight**

In `frontend/src/index.css`, add:

```css
.hl-keyword { color: #7c3aed; font-weight: 600; }
.hl-string { color: #059669; }
.hl-comment { color: #9ca3af; font-style: italic; }
.hl-number { color: #d97706; }
```

Update code block in FileTree to use `dangerouslySetInnerHTML`:

```tsx
<pre className="text-sm">
  <code dangerouslySetInnerHTML={{ __html: highlightCode(selected.content, selected.language) }} />
</pre>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/FileTree.tsx frontend/src/index.css
git commit -m "feat: add syntax highlighting to file viewer"
```

---

### Task 7: Delete Project

**Files:**
- Modify: `frontend/src/pages/Project.tsx`
- Modify: `backend/api/projects.py`

- [ ] **Step 1: Add delete endpoint to backend**

Modify `backend/api/projects.py` — add DELETE route:

```python
@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    supabase = database.get_supabase()
    supabase.table("agent_tasks").delete().eq("project_id", project_id).execute()
    supabase.table("generated_files").delete().eq("project_id", project_id).execute()
    supabase.table("projects").delete().eq("id", project_id).eq("user_id", user["id"]).execute()
    return {"ok": True}
```

- [ ] **Step 2: Add delete button to Project page**

Modify `frontend/src/pages/Project.tsx` — add delete button with confirmation:

```tsx
import { toast } from "../lib/toast";

const [deleting, setDeleting] = useState(false);

const handleDelete = async () => {
  if (!confirm("Delete this project and all its data?")) return;
  setDeleting(true);
  try {
    await authedFetch(`/projects/${id}`, { method: "DELETE" });
    toast.success("Project deleted");
    navigate("/");
  } catch {
    toast.error("Failed to delete project");
  } finally {
    setDeleting(false);
  }
};

// In JSX, after description:
<button
  onClick={handleDelete}
  disabled={deleting}
  className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
>
  {deleting ? "Deleting..." : "Delete project"}
</button>
```

- [ ] **Step 3: Commit**

```bash
git add backend/api/projects.py frontend/src/pages/Project.tsx
git commit -m "feat: add delete project"
```

---

### Task 8: Code Review Agent (Backend)

**Files:**
- Create: `backend/agents/code_review_agent.py`
- Modify: `backend/orchestrator.py`

**Interfaces:**
- Consumes: CodingAgent output (`generated_files` table + spec from `input_data`)
- Produces: `agent_tasks` row with `output_data.review` array
- Pipeline position: between coding and deployment

- [ ] **Step 1: Create CodeReviewAgent**

Write `backend/agents/code_review_agent.py`:

```python
import json
from datetime import datetime, timezone
from agents.base import BaseAgent
import database

SYSTEM_PROMPT = """You are a senior code reviewer. Given a specification and generated code files, review for:
1. Correctness — does the code implement the spec? Any bugs?
2. Security — any vulnerabilities, injection risks, exposed secrets?
3. Code quality — dead code, poor patterns, missing error handling?

Return ONLY valid JSON:
{
  "summary": "brief overview",
  "findings": [
    {
      "file": "path/to/file",
      "line": null,
      "severity": "error" | "warning" | "info",
      "message": "description of issue",
      "suggestion": "how to fix"
    }
  ]
}
If no issues found, return {"summary": "Code looks good", "findings": []}"""

class CodeReviewAgent(BaseAgent):
    async def execute(self, task_id: str) -> None:
        self._current_task_id = task_id
        supabase = database.get_supabase()
        await self.log("Starting code review...")

        task = supabase.table("agent_tasks").select("*").eq("id", task_id).execute()
        if not task.data:
            return
        task_data = task.data[0]
        project_id = task_data["project_id"]

        files = supabase.table("generated_files").select("file_path, content, language").eq("task_id", task_data["input_data"].get("task_id", "")).execute()
        if not files.data:
            supabase.table("agent_tasks").update({
                "status": "completed",
                "output_data": {"review": {"summary": "No files to review", "findings": []}},
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", task_id).execute()
            return

        file_list = "\n".join(f"--- {f['file_path']} ---\n{f['content']}" for f in files.data)
        spec = task_data["input_data"].get("spec", "No spec provided")

        await self.log(f"Reviewing {len(files.data)} files...")
        result = await self.call_llm(SYSTEM_PROMPT, f"SPECIFICATION:\n{spec}\n\nFILES:\n{file_list}")
        review = self._parse_review(result)

        error_count = sum(1 for f in review.get("findings", []) if f.get("severity") == "error")
        warning_count = sum(1 for f in review.get("findings", []) if f.get("severity") == "warning")

        await self.log(f"Review complete: {error_count} errors, {warning_count} warnings, {len(review.get('findings', []))} total findings")

        now = datetime.now(timezone.utc).isoformat()
        supabase.table("agent_tasks").update({
            "status": "completed",
            "output_data": {"review": review},
            "completed_at": now,
        }).eq("id", task_id).execute()

        supabase.table("agent_tasks").insert({
            "project_id": project_id,
            "agent_type": "deployment",
            "status": "pending",
            "input_data": {"task_id": task_data["input_data"].get("task_id", ""), "file_count": len(files.data)},
        }).execute()

    def _parse_review(self, raw: str) -> dict:
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict) and "findings" in parsed:
            return parsed
        return {"summary": "Failed to parse review", "findings": []}
```

- [ ] **Step 2: Wire into orchestrator**

Modify `backend/orchestrator.py` — add import + register in AGENT_MAP:

```python
from agents.code_review_agent import CodeReviewAgent

AGENT_MAP = {
    # ... existing agents ...
    "code_review": CodeReviewAgent(),
}
```

- [ ] **Step 3: Update CodingAgent to chain to code_review instead of deployment**

Modify `backend/agents/coding_agent.py` — change the chaining insert:

```python
# Change agent_type from "deployment" to "code_review"
supabase.table("agent_tasks").insert({
    "project_id": task_data["project_id"],
    "agent_type": "code_review",
    "status": "pending",
    "input_data": {"task_id": task_id, "spec": task_data["input_data"].get("spec", ""), "file_count": len(files)},
}).execute()
```

- [ ] **Step 4: Test agent**

Write `backend/tests/test_code_review_agent.py`:

```python
import pytest
from agents.code_review_agent import CodeReviewAgent

def test_parse_review_empty():
    agent = CodeReviewAgent()
    result = agent._parse_review('{"summary": "ok", "findings": []}')
    assert result["summary"] == "ok"
    assert result["findings"] == []

def test_parse_review_with_markdown():
    agent = CodeReviewAgent()
    result = agent._parse_review("```json\n{\"summary\": \"test\", \"findings\": [{\"file\": \"a.ts\", \"severity\": \"error\", \"message\": \"bug\", \"suggestion\": \"fix\"}]}\n```")
    assert len(result["findings"]) == 1
    assert result["findings"][0]["file"] == "a.ts"

def test_parse_review_invalid():
    agent = CodeReviewAgent()
    result = agent._parse_review("not json")
    assert result["summary"] == "Failed to parse review"
```

- [ ] **Step 5: Run tests + commit**

```bash
cd backend && python -m pytest tests/test_code_review_agent.py -v 2>&1 | tail -10
git add backend/agents/code_review_agent.py backend/orchestrator.py backend/agents/coding_agent.py backend/tests/test_code_review_agent.py
git commit -m "feat: add code review agent to pipeline"
```

---

### Task 9: Code Review UI (Frontend)

**Files:**
- Create: `frontend/src/components/CodeReview.tsx`
- Modify: `frontend/src/pages/Project.tsx`

- [ ] **Step 1: Create CodeReview component**

Write `frontend/src/components/CodeReview.tsx`:

```tsx
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

export default function CodeReview({ projectId, onFileClick }: { projectId: string; onFileClick?: (path: string) => void }) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await authedFetch(`/projects/${projectId}/tasks`);
      const tasks = await res.json();
      const reviewTask = tasks.find((t: any) => t.agent_type === "code_review" && t.status === "completed");
      if (reviewTask?.output_data?.review) {
        setReview(reviewTask.output_data.review);
      }
      setLoading(false);
    };
    load();
  }, [projectId]);

  if (loading) return null;
  if (!review || !review.findings?.length) return null;

  const severityClass = (s: string) =>
    s === "error" ? "border-l-red-500 bg-red-50" :
    s === "warning" ? "border-l-amber-500 bg-amber-50" :
    "border-l-blue-500 bg-blue-50";

  const severityIcon = (s: string) =>
    s === "error" ? "🔴" : s === "warning" ? "🟡" : "🔵";

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-3">Code Review</h2>
      {review.summary && <p className="text-sm text-gray-500 mb-3">{review.summary}</p>}
      <div className="space-y-2">
        {review.findings.map((f, i) => (
          <div key={i} className={`border-l-4 rounded-r-lg p-3 ${severityClass(f.severity)}`}>
            <div className="flex items-start gap-2">
              <span className="text-sm">{severityIcon(f.severity)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{f.message}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  {f.file && (
                    <button
                      className="text-blue-600 hover:underline truncate"
                      onClick={() => onFileClick?.(f.file)}
                    >
                      {f.file}{f.line ? `:${f.line}` : ""}
                    </button>
                  )}
                </div>
                {f.suggestion && (
                  <p className="text-xs text-gray-500 mt-1 italic">Suggestion: {f.suggestion}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into Project page**

Modify `frontend/src/pages/Project.tsx` — add CodeReview after AgentTimeline + FileTree, pass file click handler:

```tsx
import CodeReview from "../components/CodeReview";

const [selectedFile, setSelectedFile] = useState<string | null>(null);

// Pass to FileTree:
<FileTree projectId={id!} selectedPath={selectedFile} onSelect={setSelectedFile} />

// After the grid:
<CodeReview projectId={id!} onFileClick={setSelectedFile} />
```

Update FileTree to accept `selectedPath` prop and scroll to file.

- [ ] **Step 3: Test + commit**

```bash
git add frontend/src/components/CodeReview.tsx frontend/src/pages/Project.tsx
git commit -m "feat: add code review UI panel"
```

---

### Task 10 (Cleanup): Stale Worktrees

**Files:** N/A — shell commands

- [ ] **Step 1: Remove stale worktree**

```bash
cd /home/venu/Proposals/ai-coding-factory
git worktree remove .claude/worktrees/agent-a48103e232c0c66de 2>/dev/null || git worktree prune
git worktree remove .claude/worktrees/agent-a86f2f76e5093eda3 2>/dev/null || git worktree prune
```

- [ ] **Step 2: Commit**

```bash
git commit --allow-empty -m "chore: remove stale worktrees"
```
