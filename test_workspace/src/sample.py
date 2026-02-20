"""Manual test fixture for SDD Workbench F05 line jump."""

from dataclasses import dataclass
from typing import Iterable


@dataclass
class Item:
    name: str
    score: int


def normalize_scores(items: Iterable[Item]) -> list[int]:
    values: list[int] = []
    for item in items:
        capped = min(max(item.score, 0), 100)
        values.append(capped)
    return values


def average(values: list[int]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def format_report(title: str, values: list[int]) -> str:
    header = f"== {title} =="
    body = ", ".join(str(value) for value in values)
    mean = average(values)
    return f"{header}\nvalues: {body}\naverage: {mean:.2f}"


def main() -> None:
    sample_items = [
        Item(name="alpha", score=91),
        Item(name="beta", score=73),
        Item(name="gamma", score=120),
        Item(name="delta", score=-4),
    ]
    normalized = normalize_scores(sample_items)
    print(format_report("sample", normalized))


if __name__ == "__main__":
    main()
