#!/usr/bin/env python3
"""
Agent Output Quality Evaluation — runs each agent with real LLM, scores output.

Usage:
    LLM_MOCK=false python eval/eval_agents.py
    python eval/eval_agents.py --mock        # use mock responses for baseline
    python eval/eval_agents.py --single coding  # run one agent only
    python eval/eval_agents.py --verbose     # full output per agent
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings
from agents.requirements_agent import RequirementsAgent, SYSTEM_PROMPT as REQ_PROMPT
from agents.architecture_agent import ArchitectureAgent, SYSTEM_PROMPT as ARCH_PROMPT
from agents.coding_agent import CodingAgent, SYSTEM_PROMPT as CODE_PROMPT
from agents.code_review_agent import CodeReviewAgent, SYSTEM_PROMPT as REVIEW_PROMPT
from agents.deployment_agent import DeploymentAgent, DEPLOY_SYSTEM_PROMPT as DEPLOY_PROMPT


SAMPLE_INPUTS = {
    "requirements": "Build a habit tracking app where users can create daily habits, check them off, and see weekly streaks. Include reminders and optional friends feature.",
    "architecture": '{"name": "Habit Tracker", "tech_stack": ["React 19", "FastAPI", "SQLite"], "features": [{"name": "CRUD Habits", "priority": "P0"}], "data_models": [{"name": "Habit", "fields": ["id", "name", "streak", "created_at"]}], "api_endpoints": ["GET /habits", "POST /habits", "PATCH /habits/:id"]}',
    "coding": '{"original_spec": "Build habit tracker", "architecture": {"tech_stack": [{"technology": "React", "version": "19"}]}}',
    "code_review": "",
    "deployment": "",
}

# Scoring rubric used by the evaluator LLM
EVAL_MODEL = "deepseek-v4-flash-free"

EVAL_PROMPT = """You are a senior engineering manager evaluating AI agent outputs. Score each dimension 1-5.

Return ONLY valid JSON:
{
  "scores": {
    "json_validity": 1-5,
    "schema_compliance": 1-5,
    "completeness": 1-5,
    "specificity": 1-5,
    "actionability": 1-5
  },
  "total_score": (average * 20),
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]
}

Scoring guide:
- json_validity: Is output valid parseable JSON?
- schema_compliance: Does output match expected schema fields?
- completeness: Are all required sections present and non-empty?
- specificity: Are recommendations concrete (versions, examples, exact paths)?
- actionability: Could a developer execute this without guessing?

Be harsh. 3 = average. 5 = exceptional. 1 = unusable."""


async def run_agent(agent_name: str) -> tuple[str, str, float]:
    """Run a single agent with the real LLM and return (system_prompt, output, duration_seconds)."""
    agents = {
        "requirements": lambda: RequirementsAgent().call_llm(REQ_PROMPT, SAMPLE_INPUTS["requirements"]),
        "architecture": lambda: ArchitectureAgent().call_llm(ARCH_PROMPT, SAMPLE_INPUTS["architecture"]),
        "coding": lambda: CodingAgent().call_llm(CODE_PROMPT, SAMPLE_INPUTS["coding"]),
    }

    prompts = {
        "requirements": REQ_PROMPT,
        "architecture": ARCH_PROMPT,
        "coding": CODE_PROMPT,
    }

    if agent_name not in agents:
        raise ValueError(f"Unknown agent: {agent_name}. Pick: {list(agents.keys())}")

    start = time.time()
    output = await agents[agent_name]()
    duration = time.time() - start
    return prompts[agent_name], output, duration


async def eval_output(agent_name: str, system_prompt: str, output: str) -> dict:
    """Score an agent's output using the evaluator LLM (or basic checks in mock mode)."""
    from agents.base import BaseAgent

    # Basic syntax + length check for mock mode
    if settings.llm_mock:
        return basic_eval(agent_name, output)

    class EvalAgent(BaseAgent):
        async def execute(self, _): pass

    eval_agent = EvalAgent()
    eval_agent._current_task_id = None
    expected_schema = {
        "requirements": ["name", "description", "features", "tech_stack", "api_endpoints", "data_models"],
        "architecture": ["tech_stack", "data_model", "api_contracts", "component_tree", "file_structure", "implementation_order", "key_design_decisions"],
        "coding": ["file_path", "content", "language"],
    }.get(agent_name, "any")
    user_msg = json.dumps({
        "agent": agent_name,
        "expected_schema": expected_schema,
        "output": output[:3000],
    }, indent=2)

    result = await eval_agent.call_llm(EVAL_PROMPT, user_msg, model=EVAL_MODEL)
    try:
        parsed = json.loads(result) if isinstance(result, str) else result
        if isinstance(parsed, dict):
            return parsed
        return {"total_score": 0, "error": f"Expected dict, got {type(parsed).__name__}"}
    except json.JSONDecodeError:
        return {"total_score": 0, "error": f"Failed to parse eval: {result[:200]}"}


def basic_eval(agent_name: str, output: str) -> dict:
    """Basic quality check without LLM call (used in mock mode)."""
    try:
        parsed = json.loads(output)
    except json.JSONDecodeError:
        return {"total_score": 10, "scores": {"json_validity": 1, "schema_compliance": 1, "completeness": 1, "specificity": 1, "actionability": 1}, "error": "Invalid JSON"}

    expected = {
        "requirements": ["name", "description", "features", "tech_stack"],
        "architecture": ["tech_stack", "data_model", "api_contracts"],
        "coding": ["file_path", "content"],
    }.get(agent_name, [])

    found = 0
    total_possible = len(expected)

    if isinstance(parsed, list):
        if agent_name == "coding":
            fields_in = sum(1 for f in expected if all(f in item for item in parsed))
            found = fields_in if parsed else 0
            total_possible = len(parsed) * len(expected) if parsed else 1
    elif isinstance(parsed, dict):
        found = sum(1 for k in expected if k in parsed)
        total_possible = len(expected)

    ratio = found / max(total_possible, 1)
    json_score = min(5, max(1, int(ratio * 5)))
    completeness_score = min(5, max(1, int(len(output) / 200)))
    specificity_score = min(5, max(1, int(ratio * 4)))

    total = (json_score + completeness_score + specificity_score) * 20 // 3
    return {
        "total_score": total,
        "scores": {"json_validity": json_score, "schema_compliance": json_score, "completeness": completeness_score, "specificity": specificity_score, "actionability": 3},
        "strengths": ["Output is valid JSON"] if json.loads(output) else [],
        "weaknesses": ["Mock mode — no real LLM evaluation"] if not output else [],
        "note": "Mock eval — scores reflect syntax/format only",
    }


def print_report(results: dict[str, dict], verbose: bool = False):
    """Print a formatted evaluation report."""
    print("\n" + "=" * 60)
    print("  AGENT OUTPUT QUALITY REPORT")
    print("=" * 60)

    totals = []
    for agent_name, data in results.items():
        if "error" not in data:
            totals.append(data["total_score"])

    print(f"\n📊 Aggregate: {sum(totals)/len(totals):.1f}/100 avg ({len(totals)} agents)\n" if totals else "")

    for agent_name, data in results.items():
        score = data.get("total_score", 0)
        marker = "✅" if score >= 80 else "⚠️ " if score >= 50 else "❌"
        print(f"  {marker} {agent_name.upper():15s}  {score:3d}/100  ({data.get('duration', 0):.1f}s)")

        if "error" in data:
            print(f"       Error: {data['error']}")
            continue

        scores = data.get("scores", {})
        for dim, val in scores.items():
            bar = "█" * val + "░" * (5 - val)
            print(f"       {dim:20s} {bar} {val}/5")

        if verbose:
            print(f"\n       💪 Strengths: {', '.join(data.get('strengths', []))}")
            print(f"       🔧 Weaknesses: {', '.join(data.get('weaknesses', []))}")
            print(f"       💡 Suggestions: {', '.join(data.get('suggestions', []))}")
            print()

    print("=" * 60)


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate agent output quality")
    parser.add_argument("--mock", action="store_true", help="Use mock responses (baseline)")
    parser.add_argument("--single", type=str, help="Run single agent (requirements|architecture|coding)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Detailed output per agent")
    args = parser.parse_args()

    if args.mock:
        os.environ["LLM_MOCK"] = "true"

    agents_to_run = ["requirements", "architecture", "coding"]
    if args.single:
        agents_to_run = [args.single]

    print(f"\n🔬 Evaluating agents: {', '.join(agents_to_run)}")
    print(f"   LLM_MOCK={os.environ.get('LLM_MOCK', 'false')}")
    if not os.environ.get("LLM_MOCK"):
        from agents.base import OMNIROUTER_MODEL
        print(f"   Model: {OMNIROUTER_MODEL}")
        key = settings.omnirouter_api_key
        print(f"   API key: {key[:8]}...{key[-4:] if len(key) > 12 else '(demo)'}")

    results = {}
    for name in agents_to_run:
        print(f"\n─── Running {name} agent ───")
        try:
            prompt, output, duration = await run_agent(name)
            print(f"   ⏱  {duration:.1f}s")
            print(f"   Output length: {len(output)} chars")

            eval_result = await eval_output(name, prompt, output)
            eval_result["duration"] = duration
            results[name] = eval_result
        except Exception as e:
            results[name] = {"total_score": 0, "error": str(e), "duration": 0}

    print_report(results, verbose=args.verbose)

    # Summary line for scripts
    avg = sum(r.get("total_score", 0) for r in results.values()) / len(results)
    print(f"\nSUMMARY: avg={avg:.1f} agents={len(results)} mock={args.mock}\n")
    return avg


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(0 if exit_code >= 50 else 1)
