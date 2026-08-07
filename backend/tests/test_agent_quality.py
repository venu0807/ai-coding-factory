"""Tests for agent output quality — prompt validation, JSON parsing, schema conformance."""
import pytest
import json
from agents.base import BaseAgent


class _TestAgent(BaseAgent):
    """Minimal agent for testing base methods."""
    async def execute(self, task_id: str) -> None:
        pass


@pytest.fixture
def agent():
    return _TestAgent()


class TestJsonParsing:
    """BaseAgent.parse_json handles real LLM output patterns."""

    def test_plain_json(self, agent):
        result = agent.parse_json('{"name": "test"}')
        assert result == {"name": "test"}

    def test_with_json_markdown_fence(self, agent):
        result = agent.parse_json('```json\n{"name": "test"}\n```')
        assert result == {"name": "test"}

    def test_with_generic_markdown_fence(self, agent):
        result = agent.parse_json('```\n{"name": "test"}\n```')
        assert result == {"name": "test"}

    def test_array_output(self, agent):
        result = agent.parse_json('[{"a": 1}, {"a": 2}]')
        assert result == [{"a": 1}, {"a": 2}]

    def test_array_in_markdown(self, agent):
        result = agent.parse_json('```json\n[{"file_path": "main.py", "content": "x"}]\n```')
        assert isinstance(result, list)
        assert result[0]["file_path"] == "main.py"

    def test_extra_whitespace_handling(self, agent):
        result = agent.parse_json('  \n  {"key": "val"}  \n  ')
        assert result == {"key": "val"}

    def test_nested_markdown_not_breaking(self, agent):
        """Code review output with markdown-like content inside strings should not break parsing."""
        raw = '{"summary": "Fix the `if` statement", "findings": []}'
        result = agent.parse_json(raw)
        assert result["summary"] == "Fix the `if` statement"

    def test_clean_json_removes_fences(self, agent):
        assert agent.clean_json('```json\n{"a":1}\n```') == '{"a":1}'
        assert agent.clean_json('```\n{"a":1}\n```') == '{"a":1}'
        assert agent.clean_json('{"a":1}') == '{"a":1}'
        assert agent.clean_json('\n\n  {"a":1}  \n\n') == '{"a":1}'


class TestAgentPrompts:
    """All agents have complete, well-formed system prompts."""

    REQUIRED_SECTIONS = ["Return ONLY valid JSON", "output"]

    def _check_prompt(self, module_path: str, agent_name: str):
        import importlib
        mod = importlib.import_module(module_path)
        prompt = mod.SYSTEM_PROMPT
        assert prompt and len(prompt) > 100, f"{agent_name} SYSTEM_PROMPT too short"
        # Must include JSON field definitions
        assert ": " in prompt, f"{agent_name} prompt missing field definitions"
        assert prompt.count("{") >= 1 or prompt.count("[") >= 1, \
            f"{agent_name} prompt missing JSON schema example"

    def test_requirements_prompt(self):
        self._check_prompt("agents.requirements_agent", "RequirementsAgent")

    def test_architecture_prompt(self):
        self._check_prompt("agents.architecture_agent", "ArchitectureAgent")

    def test_coding_prompt(self):
        self._check_prompt("agents.coding_agent", "CodingAgent")

    def test_code_review_prompt(self):
        self._check_prompt("agents.code_review_agent", "CodeReviewAgent")

    def test_deployment_prompt(self):
        mod = __import__("agents.deployment_agent", fromlist=["DEPLOY_SYSTEM_PROMPT"])
        prompt = mod.DEPLOY_SYSTEM_PROMPT
        assert prompt and len(prompt) > 100, "Deployment SYSTEM_PROMPT too short"
        assert "valid JSON" in prompt or "JSON" in prompt


class TestCodeReviewReview:
    """CodeReviewAgent has review output structure matching frontend expectations."""

    def test_review_schema_has_required_fields(self):
        from agents.code_review_agent import CodeReviewAgent
        # Check the prompt defines the expected shape
        prompt = CodeReviewAgent.__module__
        mod = __import__("agents.code_review_agent", fromlist=["SYSTEM_PROMPT"])
        prompt_str = mod.SYSTEM_PROMPT
        # Frontend reads: review.summary, review.findings[].severity, review.findings[].message
        assert '"summary"' in prompt_str
        assert '"findings"' in prompt_str
        assert '"severity"' in prompt_str
        assert '"message"' in prompt_str
        assert '"suggestion"' in prompt_str

    def test_review_parse_handles_valid(self):
        from agents.code_review_agent import CodeReviewAgent
        agent = CodeReviewAgent()
        raw = json.dumps({
            "summary": "Good code",
            "overall_score": "pass",
            "findings": [
                {"file": "a.ts", "line": 1, "severity": "warning",
                 "dimension": "code_quality", "message": "x", "suggestion": "y"}
            ]
        })
        result = agent.parse_json(raw)
        assert "findings" in result
        assert len(result["findings"]) == 1

    def test_review_empty_findings(self):
        from agents.code_review_agent import CodeReviewAgent
        agent = CodeReviewAgent()
        raw = json.dumps({"summary": "Looks good", "findings": [], "overall_score": "pass"})
        result = agent.parse_json(raw)
        assert result["findings"] == []


class TestOutputQuality:
    """Verify agent output structures are internally consistent."""

    def test_coding_agent_parse_files_shape(self):
        """Coding agent handles both {files:[...]} and [...] shapes."""
        from agents.coding_agent import CodingAgent
        agent = CodingAgent()
        # Array shape
        parsed = agent.parse_json('[{"file_path": "a.py", "content": "x"}]')
        files = parsed if isinstance(parsed, list) else []
        assert len(files) == 1
        assert files[0]["file_path"] == "a.py"
        # Dict with files key shape
        parsed2 = agent.parse_json('{"files": [{"file_path": "b.py", "content": "y"}]}')
        files2 = parsed2.get("files", [])
        assert len(files2) == 1
        assert files2[0]["file_path"] == "b.py"

    def test_deployment_agent_parse_has_required_fields(self):
        """Deployment output must have platform and config_files."""
        from agents.deployment_agent import DeploymentAgent
        agent = DeploymentAgent()
        raw = json.dumps({
            "platform": "docker",
            "config_files": [{"file_path": "Dockerfile", "content": "FROM python"}],
            "build_steps": ["docker build"],
            "env_vars": [],
            "deploy_steps": [],
            "health_check_url": None,
            "post_deploy_checks": [],
            "estimated_deploy_time_seconds": 60,
        })
        result = agent.parse_json(raw)
        assert "platform" in result
        assert "config_files" in result
        assert "build_steps" in result
