#!/usr/bin/env python3
import argparse
import csv
from pathlib import Path


FIELDNAMES = [
    "Prompt",
    "Issues",
    "Overall result",
    "Overall sentiment",
    "Observations",
]


def count_data_rows(csv_path: Path, delimiter: str) -> int:
    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        return sum(1 for _ in reader)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Append one evaluation row into TemplateDeRespostas.csv"
    )
    parser.add_argument("--csv", required=True, help="Target CSV path")
    parser.add_argument("--prompt", required=True, help="Prompt content")
    parser.add_argument("--issues", required=True, help="Issues content")
    parser.add_argument("--overall-result", required=True, help="Overall result")
    parser.add_argument(
        "--overall-sentiment", required=True, help="Overall sentiment"
    )
    parser.add_argument("--observations", required=True, help="Observations")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    should_write_header = not csv_path.exists()

    csv_path.parent.mkdir(parents=True, exist_ok=True)

    with csv_path.open("a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=FIELDNAMES,
            delimiter=";",
            quoting=csv.QUOTE_MINIMAL,
        )
        if should_write_header:
            writer.writeheader()

        writer.writerow(
            {
                "Prompt": args.prompt,
                "Issues": args.issues,
                "Overall result": args.overall_result,
                "Overall sentiment": args.overall_sentiment,
                "Observations": args.observations,
            }
        )

    total_rows = count_data_rows(csv_path, delimiter=";")
    print(f"Arquivo atualizado: {csv_path}")
    print(f"Linhas de dados: {total_rows}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
