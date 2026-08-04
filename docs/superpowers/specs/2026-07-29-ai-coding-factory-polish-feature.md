# AI Coding Factory — UX Polish + Code Review Agent

## Summary

Two workstreams: polish frontend UX and add Code Review Agent to pipeline.

---

## UX Polish

### Navbar
- Top bar across all pages: app name/logo, auth state (user email), logout button
- Sticky, responsive

### Loading States
- Replace bare "Loading..." text with skeleton components
- Index page: skeleton cards for project list
- Project page: skeleton for AgentTimeline + FileTree

### Empty States
- "No projects yet — create your first one" on Index
- "Waiting for agents..." with subtle animation on Project (already minimal, improve)

### Toast Notifications
- Lightweight toast system for success/error feedback
- Auto-dismiss after 4s
- Used for: project created, project deleted, auth errors

### Form Validation
- Login/Signup: email format check, password min length
- NewProjectForm: name required, description optional
- Inline error messages, not just generic error block

### Error Boundary
- Wrap each route in error boundary
- Catches render errors, shows fallback with retry button

### Syntax Highlighting
- FileTree code viewer: simple CSS-based token highlighting
- Language detection from file extension

### Delete Project
- Delete button on Project page with confirmation

---

## Code Review Agent

### Pipeline position
Runs after Coding Agent, before Deployment Agent.

### Behavior
- Receives Coding Agent output (generated files, spec)
- Reviews each file for: correctness, security issues, code quality
- Writes review as `agent_tasks` entry with:
  - `output_data.review`: array of finding objects
  - Each finding: `{ file, line?, severity, message, suggestion }`
- Does NOT block pipeline — Deployment Agent proceeds regardless
- Findings visible on Project page in a new "Code Review" section

### UI
- New review panel in AgentTimeline (or separate section)
- Shows findings grouped by severity (error, warning, info)
- Clickable file paths that select the file in FileTree

### Data flow
```
Requirements → Architecture → Coding → [Code Review] → Deployment
                                           ↓
                                    stored as task output
                                           ↓
                                    displayed in frontend
```

### Agent prompt
- Given generated code files + original spec
- Check: are requirements met? Any security issues? Any obvious bugs?
- Output structured JSON with findings array
- Uses OmniRouter same as other agents

---

## Implementation order

1. Toast notification system
2. Navbar with auth
3. Loading skeletons
4. Empty states
5. Form validation
6. Error boundary
7. Syntax highlighting
8. Delete project
9. Code Review Agent (backend)
10. Code Review UI (frontend)
