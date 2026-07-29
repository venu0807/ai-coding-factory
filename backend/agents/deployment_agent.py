import json
import os
from datetime import datetime, timezone
from agents.base import BaseAgent
import database

DEPLOY_SYSTEM_PROMPT = """You are a senior DevOps engineer. Given generated source files, produce production-ready deployment configuration.

Return ONLY valid JSON with these fields:
- platform: "vercel" | "docker" | "railway" | "fly" | "manual" — pick most appropriate
- config_files: array of {file_path, content} for deployment configs
- build_steps: array of shell commands to build (one per step)
- env_vars: array of {key, description, required, default_value}
- deploy_steps: array of shell commands to deploy (one per step)
- health_check_url: string or null
- post_deploy_checks: array of {check, command, expected_outcome}
- estimated_deploy_time_seconds: number

Rules:
- Generate real config files (Dockerfile, vercel.json, fly.toml, Dockerfile.railway) matching the tech stack
- Include a health check that actually works for the given stack
- Include monitoring/logging recommendations
- Output must be parseable JSON — no markdown fences, no extra text"""


class DeploymentAgent(BaseAgent):
    async def execute(self, task_id: str) -> None:
        self._current_task_id = task_id
        supabase = database.get_supabase()
        await self.log("Starting deployment setup...")
        task = supabase.table("agent_tasks").select("*").eq("id", task_id).execute()
        if not task.data:
            return
        task_data = task.data[0]
        project_id = task_data["project_id"]

        # Collect all generated files
        await self.log("Collecting generated files...")
        files_result = supabase.table("generated_files") \
            .select("*") \
            .eq("task_id", task_id) \
            .execute()
        files = files_result.data or []

        if not files:
            await self.log("No files with this task ID, looking for project-level files...")
            tasks_result = supabase.table("agent_tasks") \
                .select("id") \
                .eq("project_id", project_id) \
                .in_("agent_type", ["coding"]) \
                .execute()
            coding_task_ids = [t["id"] for t in tasks_result.data]
            if coding_task_ids:
                files_result = supabase.table("generated_files") \
                    .select("*") \
                    .in_("task_id", coding_task_ids) \
                    .execute()
                files = files_result.data or []

        await self.log(f"Found {len(files)} files to deploy")
        file_list = [{"path": f["file_path"], "content": f["content"][:2000]} for f in files]
        prompt = json.dumps({"project_id": project_id, "files": file_list}, indent=2)

        try:
            await self.log("Generating deployment configuration...")
            result = await self.call_llm(DEPLOY_SYSTEM_PROMPT, prompt)
            parsed = self._parse_json(result)
            now = datetime.now(timezone.utc).isoformat()

            await self.log(f"Deploy platform: {parsed.get('platform', 'unknown')}")
            if parsed.get("config_files"):
                await self.log(f"Generated {len(parsed['config_files'])} config files")

            # Push to GitHub
            await self.log("Pushing to GitHub...")
            push_result = self._push_to_github(project_id, files, parsed)
            parsed["push_result"] = push_result
            if "repo" in push_result:
                await self.log(f"Pushed to {push_result['repo']}")
            else:
                await self.log(f"GitHub push skipped: {push_result.get('error', 'unknown')}")

            supabase.table("agent_tasks").update({
                "status": "completed",
                "output_data": {"deployment": parsed},
                "completed_at": now,
            }).eq("id", task_id).execute()

            supabase.table("projects").update({
                "deployment_config": parsed,
                "status": "deployable",
            }).eq("id", project_id).execute()

        except Exception as e:
            now = datetime.now(timezone.utc).isoformat()
            await self.log(f"Failed: {str(e)}")
            supabase.table("agent_tasks").update({
                "status": "failed",
                "error": str(e),
                "completed_at": now,
            }).eq("id", task_id).execute()

    def _push_to_github(self, project_id: str, files: list[dict], deploy_config: dict) -> dict:
        """Push generated files to a new GitHub repo. Requires GITHUB_TOKEN in env."""
        token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
        if not token:
            return {"error": "No GITHUB_TOKEN set — skipping push"}
        repo_name = f"ai-factory-{project_id[:8]}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
        }
        import httpx
        client = httpx.Client(headers=headers, timeout=30)
        # Create repo
        resp = client.post("https://api.github.com/user/repos", json={
            "name": repo_name, "private": False, "auto_init": True,
        })
        if resp.status_code not in (201, 422):
            return {"error": f"Failed to create repo: {resp.status_code}"}
        repo_full = resp.json().get("full_name") if resp.status_code == 201 else f"user/{repo_name}"
        # Get default branch SHA
        branch_resp = client.get(f"https://api.github.com/repos/{repo_full}/git/refs/heads/main")
        if branch_resp.status_code != 200:
            branch_resp = client.get(f"https://api.github.com/repos/{repo_full}/git/refs/heads/master")
        if branch_resp.status_code != 200:
            return {"error": "Cannot find default branch"}
        sha = branch_resp.json()["object"]["sha"]
        # Create blob for each file, build tree, create commit
        tree_items = []
        for f in files:
            blob = client.post(f"https://api.github.com/repos/{repo_full}/git/blobs", json={
                "content": f["content"], "encoding": "utf-8",
            }).json()
            tree_items.append({"path": f["file_path"], "mode": "100644", "type": "blob", "sha": blob["sha"]})
        # Add deploy config files
        for cf in deploy_config.get("config_files", []):
            blob = client.post(f"https://api.github.com/repos/{repo_full}/git/blobs", json={
                "content": cf["content"], "encoding": "utf-8",
            }).json()
            tree_items.append({"path": cf["file_path"], "mode": "100644", "type": "blob", "sha": blob["sha"]})
        tree = client.post(f"https://api.github.com/repos/{repo_full}/git/trees", json={
            "base_tree": sha, "tree": tree_items,
        }).json()
        commit = client.post(f"https://api.github.com/repos/{repo_full}/git/commits", json={
            "message": f"AI-generated project {project_id[:8]}",
            "tree": tree["sha"], "parents": [sha],
        }).json()
        client.patch(f"https://api.github.com/repos/{repo_full}/git/refs/heads/main", json={
            "sha": commit["sha"],
        })
        client.close()
        return {"repo": f"https://github.com/{repo_full}", "deploy_url": deploy_config.get("health_check_url")}

    def _parse_json(self, raw: str) -> dict:
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned)
