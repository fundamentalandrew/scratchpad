"""
Handles batching, deduplication, and multi-choice presentation of subagent questions.
"""

import sys
from dataclasses import dataclass, field

MAX_INPUT_ATTEMPTS = 5


@dataclass
class Question:
    agent: str
    file: str
    line: int
    assumption: str
    question: str
    options: list[str] = field(default_factory=list)


@dataclass
class AnsweredQuestion:
    question: Question
    answer: str
    answer_index: int  # -1 for custom input


def deduplicate_questions(all_questions: list[Question]) -> list[Question]:
    """Deduplicate questions that ask the same thing about the same location."""
    seen = {}
    deduped = []

    for q in all_questions:
        # Key on file + line + normalized question text
        key = (q.file, q.line, q.question.strip().lower())
        if key not in seen:
            seen[key] = q
            deduped.append(q)
        else:
            # Merge: note that multiple agents flagged this
            existing = seen[key]
            if q.agent not in existing.agent:
                existing.agent = f"{existing.agent}, {q.agent}"
            # Merge unique options
            for opt in q.options:
                if opt not in existing.options:
                    existing.options.append(opt)

    return deduped


def present_questions(questions: list[Question]) -> list[AnsweredQuestion]:
    """Present batched questions to the user in multi-choice format and collect answers."""
    if not questions:
        return []

    print("\n" + "=" * 70)
    print("  DEFERRED QUESTIONS FROM REVIEW AGENTS")
    print("=" * 70)

    if not sys.stdin.isatty():
        print(f"  {len(questions)} questions were collected, but stdin is not a TTY.")
        print("  Skipping interactive Q&A — agent assumptions will be carried into the")
        print("  draft as-is. Run from a real terminal to answer interactively.")
        print("=" * 70 + "\n")
        return []

    print("  The agents encountered ambiguities and need your input.")
    print("=" * 70)

    answers = []

    for i, q in enumerate(questions, 1):
        print(f"\n--- Question {i}/{len(questions)} ---")
        print(f"  Source: {q.agent}")
        print(f"  File:   {q.file}:{q.line}")
        print(f"  Agent assumed: {q.assumption}")
        print(f"\n  {q.question}\n")

        for j, opt in enumerate(q.options, 1):
            print(f"  [{j}] {opt}")
        print(f"  [{len(q.options) + 1}] Custom answer")
        print()

        resolved = False
        for _ in range(MAX_INPUT_ATTEMPTS):
            try:
                raw = input(f"  Your choice (1-{len(q.options) + 1}): ").strip()
                choice = int(raw)
                if 1 <= choice <= len(q.options):
                    answers.append(AnsweredQuestion(
                        question=q,
                        answer=q.options[choice - 1],
                        answer_index=choice - 1,
                    ))
                    resolved = True
                    break
                elif choice == len(q.options) + 1:
                    custom = input("  Your answer: ").strip()
                    answers.append(AnsweredQuestion(
                        question=q,
                        answer=custom,
                        answer_index=-1,
                    ))
                    resolved = True
                    break
                else:
                    print(f"  Please enter a number between 1 and {len(q.options) + 1}")
            except ValueError:
                print("  Please enter a valid number.")
            except (EOFError, KeyboardInterrupt):
                print("\n  Skipping remaining questions.")
                return answers

        if not resolved:
            print(f"\n  No valid answer after {MAX_INPUT_ATTEMPTS} attempts. "
                  f"Skipping remaining questions.")
            return answers

    print("\n" + "=" * 70)
    print(f"  All {len(questions)} questions answered. Continuing review...")
    print("=" * 70 + "\n")

    return answers
