"""Inventory content metadata; this does not measure knowledge or validate ECO mappings."""
from pathlib import Path
from collections import Counter
import argparse
import hashlib
import json
import re
import statistics

ROOT = Path(__file__).resolve().parents[1]
DOMAINS = {"People": (8, 33), "Process": (10, 41), "Business Environment": (8, 26)}


def instructional_words(lesson):
    """Same scope as verify.py:text_count; excludes questions, terms and recall prompts."""
    example, transfer, artifact = (lesson[k] for k in ("workedExample", "transferCase", "artifact"))
    parts = [lesson["introduction"]]
    parts.extend(p for section in lesson["sections"] for p in section["paragraphs"])
    parts.extend(example["steps"])
    parts.extend([example["context"], example["conclusion"], transfer["context"]])
    parts.extend(transfer["analysis"])
    parts.extend([artifact["instructions"], artifact["example"]])
    return len(re.findall(r"\S+", " ".join(parts)))


def inventory():
    paths = sorted((ROOT / "content").glob("pack-*.json"))
    lessons = [lesson for path in paths for lesson in json.loads(path.read_text(encoding="utf-8-sig"))["lessons"]]
    questions = [question for lesson in lessons for question in lesson["questions"]]
    tasks = []
    for domain, (task_count, _) in DOMAINS.items():
        for task_id in range(1, task_count + 1):
            matches = lambda item: item["eco"]["domain"] == domain and item["eco"]["taskId"] == task_id
            tasks.append({"domain": domain, "taskId": task_id,
                          "lessonIds": [item["id"] for item in lessons if matches(item)],
                          "questionIds": [item["id"] for item in questions if matches(item)]})
    invalid = [item["id"] for item in lessons + questions
               if item["eco"]["domain"] not in DOMAINS
               or item["eco"]["taskId"] not in range(1, DOMAINS[item["eco"]["domain"]][0] + 1)]
    word_counts = [instructional_words(lesson) for lesson in lessons]
    singles = [question for question in questions if question["type"] == "single"]
    multis = [question for question in questions if question["type"] == "multi"]
    longest_correct = [question["id"] for question in singles
                       if len(question["options"][question["correct"][0]])
                       > max(len(option) for index, option in enumerate(question["options"]) if index != question["correct"][0])]
    return {
        "method": "Direct primary metadata only. Counts do not prove depth, correct mapping, scenario independence or exam readiness.",
        "ecoVersion": "2026-08-11",
        "inputSha256LF": {path.relative_to(ROOT).as_posix(): hashlib.sha256(path.read_text(encoding="utf-8-sig").encode("utf-8")).hexdigest() for path in paths},
        "counts": {"packs": len(paths), "lessons": len(lessons), "questions": len(questions),
                   "cards": sum(len(lesson["cards"]) for lesson in lessons),
                   "transferCases": sum(bool(lesson.get("transferCase")) for lesson in lessons),
                   "artifacts": sum(bool(lesson.get("artifact")) for lesson in lessons),
                   "labs": sum(bool(lesson.get("lab")) for lesson in lessons),
                   "linkedCases": sum(bool(lesson.get("caseStudy")) for lesson in lessons),
                   "charts": sum(bool(lesson.get("lab", {}).get("chart")) for lesson in lessons),
                   "reserveQuestions": sum(question.get("reserve") is True for question in questions),
                   "uniqueQuestionIds": len({question["id"] for question in questions}),
                   "uniqueScenarioFamilyIds": len({question["scenarioFamilyId"] for question in questions})},
        "questionMetadata": {key: dict(sorted(Counter(question[key] for question in questions).items()))
                             for key in ("type", "approach", "difficulty", "context", "status")},
        "domains": [{"domain": domain, "questions": sum(question["eco"]["domain"] == domain for question in questions),
                     "bankPercent": round(100 * sum(question["eco"]["domain"] == domain for question in questions) / len(questions), 2),
                     "ecoPercent": weight} for domain, (_, weight) in DOMAINS.items()],
        "ecoTasks": tasks,
        "tasksWithoutDirectQuestions": [{"domain": task["domain"], "taskId": task["taskId"]} for task in tasks if not task["questionIds"]],
        "invalidTaskIds": invalid,
        "answerLengthCue": {"method": "Python len (Unicode code points). Correct answer must be strictly longer than every distractor; ties excluded.",
                            "singleQuestions": len(singles), "correctStrictlyLongest": len(longest_correct),
                            "percent": round(100 * len(longest_correct) / len(singles), 2), "questionIds": longest_correct},
        "multiAnswerPositions": {"method": "Zero-based option indices in source files; sorted sets of correct indices.",
                                 "questions": len(multis),
                                 "correctPositionCounts": dict(sorted(Counter(str(index) for question in multis for index in question["correct"]).items())),
                                 "keyPatterns": dict(sorted(Counter(",".join(map(str, sorted(question["correct"]))) for question in multis).items()))},
        "instructionalWords": {"method": "Whitespace tokens in introduction, section paragraphs, worked example, transfer context/analysis and artifact instructions/example; matches verify.py:text_count.",
                               "min": min(word_counts), "max": max(word_counts), "median": statistics.median(word_counts), "total": sum(word_counts)},
        "lessons": [{"id": lesson["id"], "title": lesson["title"], "eco": lesson["eco"],
                     "instructionalWords": instructional_words(lesson), "questionIds": [question["id"] for question in lesson["questions"]],
                     "sourceIds": [source["id"] for source in lesson["sourceRefs"]]} for lesson in lessons]
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="Write UTF-8 JSON to this file; otherwise print it.")
    args = parser.parse_args()
    payload = json.dumps(inventory(), ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(payload, encoding="utf-8", newline="\n")
        print(f"Saved {args.output}")
    else:
        print(payload, end="")


if __name__ == "__main__":
    main()
