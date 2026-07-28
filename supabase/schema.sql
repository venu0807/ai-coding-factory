CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'idle',
    deployment_config JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_user ON projects(user_id);

CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    input_data JSONB,
    output_data JSONB,
    error TEXT,
    logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_tasks_project ON agent_tasks(project_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);

CREATE TABLE IF NOT EXISTS generated_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_files_task ON generated_files(task_id);

ALTER PUBLICATION supabase_realtime ADD TABLE agent_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
