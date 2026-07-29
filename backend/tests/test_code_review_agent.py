from agents.code_review_agent import CodeReviewAgent

agent = CodeReviewAgent()


def test_parse_review_empty():
    result = agent._parse_review('{"summary": "ok", "findings": []}')
    assert result["summary"] == "ok"
    assert result["findings"] == []


def test_parse_review_with_findings():
    raw = """{
        "summary": "issues found",
        "findings": [
            {"file": "a.ts", "severity": "error", "message": "bug", "suggestion": "fix"}
        ]
    }"""
    result = agent._parse_review(raw)
    assert len(result["findings"]) == 1
    assert result["findings"][0]["file"] == "a.ts"
    assert result["findings"][0]["severity"] == "error"


def test_parse_review_with_markdown_fence():
    result = agent._parse_review(
        '```json\n{"summary": "test", "findings": [{"file": "b.py", "severity": "warning", "message": "x", "suggestion": "y"}]}\n```'
    )
    assert len(result["findings"]) == 1
    assert result["findings"][0]["file"] == "b.py"


def test_parse_review_invalid():
    result = agent._parse_review("not json at all")
    assert result["summary"] == "Failed to parse review"
    assert result["findings"] == []


def test_parse_review_backtick_only():
    result = agent._parse_review(
        "```\n{\"summary\": \"ok\", \"findings\": []}\n```"
    )
    assert result["summary"] == "ok"
