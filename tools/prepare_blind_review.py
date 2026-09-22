"""Export question stems and stimuli without keys or explanations for a separate reviewer."""
from pathlib import Path
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
VISIBLE = ("id", "version", "type", "prompt", "options", "left", "right", "unit", "caseId", "casePosition", "stimulus")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--packs", type=int, nargs="+", required=True, choices=range(1, 7))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    questions, hashes = [], {}
    for number in args.packs:
        path = ROOT / "content" / f"pack-{number:02}.json"
        raw = path.read_text(encoding="utf-8-sig")
        hashes[path.name] = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        for lesson in json.loads(raw)["lessons"]:
            for question in lesson["questions"]:
                visible = {key: question[key] for key in VISIBLE if key in question}
                if question.get("caseId"):
                    assert lesson["caseStudy"]["id"] == question["caseId"]
                    visible["stimulus"] = lesson["caseStudy"]
                questions.append(visible)
    args.output.write_text(json.dumps({"instructions": "Solve and save your answers before reading source packs, keys, hints, principles or explanations. Record ambiguities and calculations.", "inputSha256LF": hashes, "questions": questions}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Saved {len(questions)} questions without keys: {args.output}")


if __name__ == "__main__":
    main()
