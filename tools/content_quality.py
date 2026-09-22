"""Structural and editorial gates. Passing does not establish educational validity."""
from collections import Counter, defaultdict
import math

DOMAINS = {"People": 8, "Process": 10, "Business Environment": 8}


def table(value, label):
    assert isinstance(value, dict) and value.get("caption"), (label, "table caption")
    columns, rows = value.get("columns"), value.get("rows")
    assert isinstance(columns, list) and 2 <= len(columns) <= 12 and all(isinstance(c, str) and c for c in columns), label
    assert isinstance(rows, list) and 3 <= len(rows) <= 100, label
    assert all(isinstance(row, list) and len(row) == len(columns) and all(isinstance(cell, str) for cell in row) for row in rows), (label, "table shape")


def stimulus(value, label):
    assert value.get("title") and value.get("context"), label
    if "table" in value:
        table(value["table"], label)
    if "chart" in value:
        chart = value["chart"]
        assert chart.get("title") and isinstance(chart.get("unit"), str), label
        assert 1 <= len(chart["labels"]) <= 24 and len(chart["labels"]) == len(chart["values"]), label
        assert all(isinstance(v, str) and v for v in chart["labels"]), label
        assert all(isinstance(v, (int, float)) and math.isfinite(v) and v >= 0 for v in chart["values"]), label
        assert "table" in value, (label, "chart requires a readable data table")


def sources(refs, registry, label):
    assert refs and all(ref["id"] in registry and ref.get("section") for ref in refs), (label, "source reference")


def question(q, registry):
    label = q["id"]
    assert q["version"] >= 1 and q["prompt"] and q["principle"] and q["hint"], label
    assert q["status"] == "model_reviewed" and q.get("reviewedBy") and q.get("reviewDate") and q.get("reviewModel"), (label, "peer review required")
    domain, task = q["eco"]["domain"], q["eco"]["taskId"]
    assert domain in DOMAINS and task in range(1, DOMAINS[domain] + 1), (label, "ECO task")
    assert q["approach"] in {"predictive", "agile", "hybrid"} and q["scenarioFamilyId"], label
    sources(q["sourceRefs"], registry, label)
    assert q["explanations"] and all(isinstance(text, str) and text for text in q["explanations"]), label
    if q["type"] in {"single", "multi"}:
        assert 3 <= len(q["options"]) <= 6 and len(set(q["options"])) == len(q["options"]), label
        assert len(q["options"]) == len(q["explanations"]), label
        assert len(set(q["correct"])) == len(q["correct"]) and all(isinstance(i, int) and 0 <= i < len(q["options"]) for i in q["correct"]), label
        assert len(q["correct"]) == 1 if q["type"] == "single" else 2 <= len(q["correct"]) < len(q["options"]), label
    elif q["type"] == "matching":
        assert q["left"] and q["right"] and len(q["left"]) == len(q["correct"]) == len(q["explanations"]), label
        assert all(isinstance(i, int) and 0 <= i < len(q["right"]) for i in q["correct"]), label
    elif q["type"] == "numeric":
        assert isinstance(q["answer"], (int, float)) and math.isfinite(q["answer"]), label
        assert isinstance(q["tolerance"], (int, float)) and math.isfinite(q["tolerance"]) and q["tolerance"] >= 0, label
    else:
        raise AssertionError((label, "unknown question type"))
    if "stimulus" in q:
        stimulus(q["stimulus"], label)


def editorial_metrics(questions):
    singles = [q for q in questions if q["type"] == "single"]
    multis = [q for q in questions if q["type"] == "multi"]
    longest = [q["id"] for q in singles if len(q["options"][q["correct"][0]]) > max(len(v) for i, v in enumerate(q["options"]) if i != q["correct"][0])]
    shortest = [q["id"] for q in singles if len(q["options"][q["correct"][0]]) < min(len(v) for i, v in enumerate(q["options"]) if i != q["correct"][0])]
    return {"single": len(singles), "strictlyLongestCorrect": len(longest),
            "longestPercent": round(100 * len(longest) / len(singles), 2) if singles else 0,
            "strictlyShortestCorrect": len(shortest), "shortestPercent": round(100 * len(shortest) / len(singles), 2) if singles else 0,
            "multi": len(multis), "multiFirstCorrect": sum(0 in q["correct"] for q in multis)}


def check_curriculum(lessons, registry):
    assert len(lessons) == 24
    families = defaultdict(list)
    tasks = Counter()
    case_count = 0
    for lesson in lessons:
        label = lesson["id"]
        assert lesson["version"] == 3 and len(lesson["questions"]) == 8, label
        assert lesson["status"] == "model_reviewed" and lesson.get("reviewedBy") and lesson.get("reviewDate"), label
        sources(lesson["sourceRefs"], registry, label)
        lab = lesson["lab"]
        assert lab["objective"] and lab["minutes"] == 35 and lab["context"], label
        stimulus(lab, label)
        assert len(lab["prompts"]) == 3 and len(lab["solution"]) >= 3 and len(lab["rubric"]) >= 3 and len(lab["steps"]) >= 3, label
        sources(lab["sourceRefs"], registry, label)
        case = lesson.get("caseStudy")
        if case:
            case_count += 1
            stimulus(case, label)
            linked = [q for q in lesson["questions"] if q.get("caseId") == case["id"]]
            assert sorted(q["casePosition"] for q in linked) == [1, 2, 3], label
            assert len({q["scenarioFamilyId"] for q in linked}) == 1, label
        for q in lesson["questions"]:
            question(q, registry)
            assert q["version"] == 3 and q.get("reserve") is False, q["id"]
            assert not q.get("caseId") or (case and q["caseId"] == case["id"]), q["id"]
            families[q["scenarioFamilyId"]].append(q)
            tasks[q["eco"]["domain"], q["eco"]["taskId"]] += 1
    questions = [q for l in lessons for q in l["questions"]]
    assert len({q["id"] for q in questions}) == len(questions), "duplicate question ID"
    assert len({q["prompt"] for q in questions}) == len(questions), "duplicate prompt"
    assert case_count == 6, "six linked cases required"
    for family in families.values():
        if len(family) > 1:
            assert len(family) == 3 and family[0].get("caseId") and len({q.get("caseId") for q in family}) == 1, "reused scenario family outside a linked case"
    assert len(tasks) == sum(DOMAINS.values()), "a blueprint task has no direct questions"
    metrics = editorial_metrics(questions)
    assert metrics["longestPercent"] <= 40, ("answer-length cue", metrics)
    assert metrics["shortestPercent"] <= 40, ("reversed answer-length cue", metrics)
    assert 0 < metrics["multiFirstCorrect"] < metrics["multi"], ("fixed multi position", metrics)
    positions = Counter(q["correct"][0] for q in questions if q["type"] == "single")
    assert max(positions.values()) / sum(positions.values()) <= .45, "single key position imbalance"
    print("Content quality:", metrics, "; 24 labs, 6 linked cases, 26 ECO tasks have questions.")
    return metrics
