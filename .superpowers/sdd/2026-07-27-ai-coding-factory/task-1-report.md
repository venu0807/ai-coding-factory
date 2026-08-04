# Task 1: Project Scaffold + Schema

## Summary
Created the project scaffold with Python backend configuration, Supabase database schema, and gitignore.

**Commit**: `c1a297ce42044919912585e42f693025cf414689`
**Message**: `chore: scaffold project structure and DB schema`

## Files Created
| File | Purpose |
|------|---------|
| `.gitignore` | Python/node build artifacts and env exclusions |
| `supabase/schema.sql` | 3 tables: `projects`, `agent_tasks`, `generated_files` with indexes + realtime publication |
| `backend/requirements.txt` | Pinned dependencies: FastAPI, uvicorn, supabase-py, httpx, pydantic, pydantic-settings, python-dotenv |
| `backend/.env.example` | Env vars template for OmniRouter and Supabase |
| `backend/config.py` | Pydantic `Settings` class with `poll_interval_seconds` |
| `backend/__init__.py` | Empty package init |

## Database Schema
- **projects** — UUID PK, name, description, status (default `idle`), created_at
- **agent_tasks** — UUID PK, FK to projects (CASCADE), agent_type, status (default `pending`), input_data/output_data (JSONB), error, created_at, completed_at. Indexed on `project_id` and `status`.
- **generated_files** — UUID PK, FK to agent_tasks (CASCADE), file_path, content, language, created_at. Indexed on `task_id`.
- Realtime enabled for `agent_tasks` and `projects` tables.

## Dependencies (backend/requirements.txt)
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
supabase==2.5.0
httpx==0.27.0
pydantic==2.9.0
pydantic-settings==2.5.0
python-dotenv==1.0.0
```

## Configuration (backend/config.py)
- `Settings` class reads from `.env` file via pydantic-settings
- Fields: `omnirouter_api_key`, `omnirouter_base_url` (default: `https://api.omnirouter.ai/v1`), `supabase_url`, `supabase_key`, `poll_interval_seconds` (default: 2)
- Module-level `settings` singleton instance