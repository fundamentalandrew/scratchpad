"""
Fetches and filters PR diffs using the GitHub CLI.
"""

import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

# File patterns to filter out of review (noise)
NOISE_PATTERNS = {
    # Lockfiles
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Pipfile.lock",
    "poetry.lock", "Gemfile.lock", "composer.lock", "Cargo.lock",
    "go.sum", "flake.lock", "bun.lockb",
    # Config/generated
    ".eslintrc", ".prettierrc", ".editorconfig", ".gitattributes",
}

NOISE_EXTENSIONS = {
    ".min.js", ".min.css", ".map", ".snap",
    ".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2",
    ".ttf", ".eot",
}

NOISE_DIRECTORIES = {
    "node_modules/", "vendor/", "dist/", "build/", "__pycache__/",
    ".next/", ".nuxt/", "coverage/", ".tox/",
}


@dataclass
class PRMetadata:
    number: int
    title: str = ""
    base_branch: str = "main"
    head_branch: str = ""
    files: list = field(default_factory=list)
    additions: int = 0
    deletions: int = 0
    raw_diff: str = ""
    filtered_diff: str = ""
    filtered_files: list = field(default_factory=list)
    core_file_count: int = 0
    total_diff_lines: int = 0


def run_gh(args: list[str]) -> str:
    """Run a gh CLI command and return stdout."""
    cmd = ["gh"] + args
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, check=True, timeout=30
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running gh {' '.join(args)}:", file=sys.stderr)
        print(e.stderr, file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("Error: `gh` CLI not found. Install it: https://cli.github.com/", file=sys.stderr)
        sys.exit(1)


def is_noise_file(filepath: str) -> bool:
    """Check if a file should be filtered out of review."""
    name = Path(filepath).name
    if name in NOISE_PATTERNS:
        return True
    for ext in NOISE_EXTENSIONS:
        if filepath.endswith(ext):
            return True
    for d in NOISE_DIRECTORIES:
        if d in filepath:
            return True
    # Generated files
    if name.endswith(".generated.ts") or name.endswith(".generated.go"):
        return True
    if name.endswith(".pb.go") or name.endswith("_pb2.py"):
        return True
    return False


def fetch_pr_metadata(pr_number: int) -> PRMetadata:
    """Fetch PR metadata and diff from GitHub."""
    # Get PR info
    raw = run_gh([
        "pr", "view", str(pr_number),
        "--json", "title,baseRefName,headRefName,files,additions,deletions"
    ])
    data = json.loads(raw)

    pr = PRMetadata(number=pr_number)
    pr.title = data.get("title", "")
    pr.base_branch = data.get("baseRefName", "main")
    pr.head_branch = data.get("headRefName", "")
    pr.additions = data.get("additions", 0)
    pr.deletions = data.get("deletions", 0)
    pr.files = [f["path"] for f in data.get("files", [])]

    # Get full diff
    pr.raw_diff = run_gh(["pr", "diff", str(pr_number)])

    # Filter
    pr.filtered_files = [f for f in pr.files if not is_noise_file(f)]
    pr.filtered_diff = filter_diff(pr.raw_diff)
    pr.core_file_count = len(pr.filtered_files)
    pr.total_diff_lines = pr.filtered_diff.count("\n")

    return pr


def filter_diff(raw_diff: str) -> str:
    """Remove noise files from the unified diff output."""
    lines = raw_diff.split("\n")
    result = []
    skip = False

    for line in lines:
        # Detect file header in unified diff
        if line.startswith("diff --git"):
            # Extract the b/ path
            parts = line.split(" b/")
            if len(parts) >= 2:
                filepath = parts[-1]
                skip = is_noise_file(filepath)
            else:
                skip = False

        if not skip:
            result.append(line)

    return "\n".join(result)
