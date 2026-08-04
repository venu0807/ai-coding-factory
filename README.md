# AI Coding Factory

Multi-agent coding platform. Prompt → spec → production code.

## Architecture

- **Backend:** Python FastAPI + OmniRouter LLM + Supabase
- **Frontend:** React + Vite + Tailwind + Supabase Realtime

## Setup

### 1. Supabase

Create project at `supabase.com`. Run `supabase/schema.sql` in SQL Editor.
Enable Realtime on `agent_tasks` and `projects` tables.

### 2. Backend

```bash
cd backend
cp .env.template .env
# Edit .env with your keys
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
cp .env.template ../.env
npm install
npm run dev
```

## Production Deploy

### Backend (Railway / fly.io)

```bash
# Build from Dockerfile
docker build -t ai-coding-factory .
docker run -p 8000:8000 --env-file .env ai-coding-factory
```

### Frontend (Vercel)

```bash
cd frontend
npx vercel --prod
```

Set env vars in Vercel dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE`

## Usage

1. Open http://localhost:5173
2. Sign up / sign in
3. Type project name + description
4. 5-agent pipeline runs: Requirements → Architecture → Coding → Code Review → Deployment
5. Review files, code review findings, download ZIP
6. Edit or delete projects from detail page

## Tests

```bash
cd backend && python -m pytest tests/ -q
cd frontend && npm test
```

## Local Dev

```bash
./run.sh          # starts both backend (:8000) and frontend (:5173)
LLM_MOCK=true     # use mock responses (no API key needed)
```

## What's Built

- **Phase 1:** Core pipeline — 5 agents, Supabase DB, auth, realtime
- **Phase 2a:** UX polish — Toast, Navbar, skeletons, error boundaries
- **Phase 2b:** Code Review agent — severity-colored findings panel
- **Phase 2c:** ZIP download, agent prompt quality, mobile responsive
- **Phase 3:** Auth security (bcrypt), input validation, copy-to-clipboard, loading states, error handling
- **Phase 4:** Dark mode, pagination, rate limiting, session expiry, password strength, file search, agent eval harness, sort/filter, single file download, realtime streaming, TypeScript types, accessibility