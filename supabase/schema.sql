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

-- =============================================================================
-- Row Level Security (CRITICAL): agent_tasks is on the realtime publication and
-- the frontend subscribes with the anon key. Without RLS any anonymous browser
-- could stream every user's tasks (including generated code). Each user can only
-- see rows that trace back to a project they own.
-- =============================================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own projects" ON projects;
CREATE POLICY "own projects" ON projects
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own tasks" ON agent_tasks;
CREATE POLICY "own tasks" ON agent_tasks
  FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "own files" ON generated_files;
CREATE POLICY "own files" ON generated_files
  FOR ALL TO authenticated
  USING (task_id IN (
    SELECT id FROM agent_tasks
    WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  ))
  WITH CHECK (task_id IN (
    SELECT id FROM agent_tasks
    WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  ));

