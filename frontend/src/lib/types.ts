export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  deployment_config?: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  project_id: string;
  agent_type: string;
  status: "pending" | "running" | "completed" | "failed";
  input_data?: Record<string, unknown>;
  // output_data is dynamic JSON emitted by the LLM agents (review, file_count, logs, etc.)
  output_data?: any;
  error?: string;
  logs?: Array<{ timestamp: string; message: string }>;
  created_at: string;
  completed_at?: string;
}

export interface GeneratedFile {
  id: string;
  task_id: string;
  file_path: string;
  content: string;
  language?: string;
  created_at: string;
}

export interface ReviewFinding {
  file: string;
  line: number | null;
  severity: "error" | "warning" | "info";
  dimension?: string;
  message: string;
  suggestion?: string;
}

export interface Review {
  summary?: string;
  overall_score?: "pass" | "pass_with_issues" | "fail";
  findings: ReviewFinding[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
