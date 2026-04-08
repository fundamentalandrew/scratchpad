#!/usr/bin/env python3
"""
Validates a completed SSDLC Developer Brief for structural completeness.

Usage:
    python3 scripts/validate-brief.py [path-to-brief]
    python3 scripts/validate-brief.py                   # defaults to ./ssdlc-brief.md

Checks:
  - All 7 required sections present
  - STRIDE table has entries (not just headers)
  - API contracts define at least one endpoint
  - Security checklist has actionable items
  - ADRs follow the required structure
  - No placeholder/TODO text remains
"""

import re
import sys
from pathlib import Path


class BriefValidator:
    def __init__(self, content: str):
        self.content = content
        self.lines = content.splitlines()
        self.passed: list[str] = []
        self.failed: list[str] = []
        self.warnings: list[str] = []

    def check(self, desc: str, condition: bool):
        if condition:
            self.passed.append(desc)
        else:
            self.failed.append(desc)

    def warn(self, desc: str, condition: bool):
        if not condition:
            self.warnings.append(desc)

    def has_section(self, pattern: str) -> bool:
        return bool(re.search(pattern, self.content, re.IGNORECASE))

    def section_content(self, heading_pattern: str) -> str:
        """Extract content between a heading and the next same-level heading."""
        match = re.search(
            rf"(^#{1,3}\s+.*{heading_pattern}.*$)",
            self.content,
            re.MULTILINE | re.IGNORECASE,
        )
        if not match:
            return ""
        start = match.end()
        level = match.group(0).count("#", 0, match.group(0).index(" "))
        next_heading = re.search(
            rf"^{'#' * level}\s+",
            self.content[start:],
            re.MULTILINE,
        )
        end = start + next_heading.start() if next_heading else len(self.content)
        return self.content[start:end].strip()

    def validate(self):
        # --- Required sections ---
        required_sections = [
            (r"executive summary", "Section 1: Executive Summary"),
            (r"architecture decision record|ADR", "Section 2: Architecture Decision Records"),
            (r"threat model|STRIDE", "Section 3: Threat Model"),
            (r"integration map", "Section 4: Integration Map"),
            (r"api contract", "Section 5: API Contracts"),
            (r"security controls? checklist", "Section 6: Security Controls Checklist"),
            (r"open questions|deferred", "Section 7: Open Questions"),
        ]

        for pattern, desc in required_sections:
            self.check(f"{desc} present", self.has_section(pattern))

        # --- STRIDE table quality ---
        stride_content = self.section_content("threat model|STRIDE")
        table_rows = re.findall(r"^\|[^|]+\|", stride_content, re.MULTILINE)
        # Subtract header + separator rows
        data_rows = max(0, len(table_rows) - 2)
        self.check(
            f"STRIDE table has data rows (found {data_rows})",
            data_rows >= 1,
        )

        # Check for all 6 STRIDE categories mentioned
        stride_categories = [
            "spoofing", "tampering", "repudiation",
            "information disclosure", "denial of service",
            "elevation of privilege",
        ]
        lower_stride = stride_content.lower()
        for cat in stride_categories:
            # Also match short forms like "info disclosure", "DoS", "elev"
            short = cat.split()[0][:4]
            self.check(
                f"STRIDE covers '{cat}'",
                cat in lower_stride or short in lower_stride,
            )

        # --- ADR structure ---
        adr_content = self.section_content("architecture decision|ADR")
        adr_fields = ["status", "context", "decision", "consequences"]
        for field in adr_fields:
            self.warn(
                f"ADRs include '{field}' field",
                field.lower() in adr_content.lower(),
            )

        # Check at least one ADR exists
        adr_count = len(re.findall(r"ADR-\d+", self.content))
        self.check(f"At least one ADR defined (found {adr_count})", adr_count >= 1)

        # --- API contracts ---
        api_content = self.section_content("api contract")
        endpoint_patterns = [
            r"(GET|POST|PUT|PATCH|DELETE)\s+/",
            r"`(GET|POST|PUT|PATCH|DELETE)\s+/",
        ]
        endpoint_count = sum(
            len(re.findall(p, api_content)) for p in endpoint_patterns
        )
        self.check(
            f"API contracts define endpoints (found {endpoint_count})",
            endpoint_count >= 1,
        )

        # Check for error response definitions
        error_codes = re.findall(r"\b(4\d{2}|5\d{2})\b", api_content)
        self.check(
            f"API contracts include error status codes (found {len(set(error_codes))} unique)",
            len(error_codes) >= 1,
        )

        # --- Security checklist ---
        checklist_content = self.section_content("security controls? checklist")
        checklist_items = re.findall(r"- \[[ x]\]", checklist_content)
        self.check(
            f"Security checklist has items (found {len(checklist_items)})",
            len(checklist_items) >= 1,
        )

        # --- Placeholder detection ---
        placeholder_patterns = [
            r"\[TBD\]",
            r"\[TODO\]",
            r"\[PLACEHOLDER\]",
            r"\[FILL IN\]",
            r"\[INSERT\]",
            r"\[your .*? here\]",
            r"\[specific .*?\]",  # leftover template brackets
        ]
        placeholders_found = []
        for i, line in enumerate(self.lines, 1):
            for pat in placeholder_patterns:
                if re.search(pat, line, re.IGNORECASE):
                    placeholders_found.append((i, line.strip()))
                    break

        self.check(
            "No placeholder text remaining",
            len(placeholders_found) == 0,
        )
        if placeholders_found:
            for line_no, text in placeholders_found[:5]:
                self.warnings.append(f"  Line {line_no}: {text[:80]}")

        # --- Integration map ---
        integ_content = self.section_content("integration map")
        self.check(
            "Integration map has content",
            len(integ_content.strip()) > 50,
        )

        # --- Brief length sanity ---
        word_count = len(self.content.split())
        self.warn(
            f"Brief has substantial content (word count: {word_count})",
            word_count >= 500,
        )

    def report(self) -> int:
        print()
        print("=== SSDLC Brief Validation Report ===")
        print()

        if self.passed:
            print(f"PASSED ({len(self.passed)}):")
            for p in self.passed:
                print(f"  \033[32m✓\033[0m {p}")

        if self.warnings:
            print(f"\nWARNINGS ({len(self.warnings)}):")
            for w in self.warnings:
                print(f"  \033[33m⚠\033[0m {w}")

        if self.failed:
            print(f"\nFAILED ({len(self.failed)}):")
            for f in self.failed:
                print(f"  \033[31m✗\033[0m {f}")

        print()
        total = len(self.passed) + len(self.failed)
        pct = (len(self.passed) / total * 100) if total else 0
        print(f"Score: {len(self.passed)}/{total} checks passed ({pct:.0f}%)")
        print(f"Warnings: {len(self.warnings)}")
        print("=" * 40)

        return 1 if self.failed else 0


def main():
    brief_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("./ssdlc-brief.md")

    if not brief_path.exists():
        print(f"\033[31mError: Brief not found at {brief_path}\033[0m")
        print("Usage: python3 scripts/validate-brief.py [path-to-brief]")
        sys.exit(2)

    content = brief_path.read_text()
    print(f"Validating: {brief_path} ({len(content)} chars)")

    validator = BriefValidator(content)
    validator.validate()
    sys.exit(validator.report())


if __name__ == "__main__":
    main()
