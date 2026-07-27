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
2. Type project name + description
3. Requirements Agent generates spec
4. Coding Agent generates code
5. Review files in dashboard