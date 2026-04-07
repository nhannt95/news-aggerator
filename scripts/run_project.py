import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.app.runner import run_project


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a CrewAI project by name.")
    parser.add_argument("--project", required=True, help="Project name to run.")
    parser.add_argument(
        "--input",
        default="{}",
        help="JSON string passed into the selected project pipeline.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_input = json.loads(args.input)
    result = run_project(args.project, project_input)
    print(result)


if __name__ == "__main__":
    main()
