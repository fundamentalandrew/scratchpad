#!/usr/bin/env bash
# Smoke test: validates plugin structure, file presence, and frontmatter integrity.
# Usage: bash scripts/smoke-test.sh [plugin_root]

set -uo pipefail

PLUGIN_ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
PASS=0
FAIL=0
WARN=0

green()  { printf "\033[32m✓ %s\033[0m\n" "$1"; }
red()    { printf "\033[31m✗ %s\033[0m\n" "$1"; }
yellow() { printf "\033[33m⚠ %s\033[0m\n" "$1"; }

check() {
  local desc="$1" path="$2"
  if [[ -f "$path" ]]; then
    green "$desc"
    ((PASS++))
  else
    red "$desc — missing: $path"
    ((FAIL++))
  fi
}

check_dir() {
  local desc="$1" path="$2"
  if [[ -d "$path" ]]; then
    green "$desc"
    ((PASS++))
  else
    red "$desc — missing: $path"
    ((FAIL++))
  fi
}

check_frontmatter() {
  local desc="$1" path="$2" field="$3"
  if [[ ! -f "$path" ]]; then
    red "$desc — file not found: $path"
    ((FAIL++))
    return
  fi
  if head -20 "$path" | grep -q "^${field}:"; then
    green "$desc"
    ((PASS++))
  else
    red "$desc — missing frontmatter field '$field' in $path"
    ((FAIL++))
  fi
}

check_json_field() {
  local desc="$1" path="$2" field="$3"
  if [[ ! -f "$path" ]]; then
    red "$desc — file not found: $path"
    ((FAIL++))
    return
  fi
  if python3 -c "import json,sys; d=json.load(open('$path')); assert '$field' in d" 2>/dev/null; then
    green "$desc"
    ((PASS++))
  else
    red "$desc — missing key '$field' in $path"
    ((FAIL++))
  fi
}

echo ""
echo "=== SSDLC Architect Plugin — Smoke Test ==="
echo "Plugin root: $PLUGIN_ROOT"
echo ""

echo "--- Directory Structure ---"
check_dir  ".claude-plugin/ exists"              "$PLUGIN_ROOT/.claude-plugin"
check_dir  "skills/ssdlc-plan/ exists"            "$PLUGIN_ROOT/skills/ssdlc-plan"
check_dir  "skills/ssdlc-plan/references/ exists"  "$PLUGIN_ROOT/skills/ssdlc-plan/references"
check_dir  "agents/ exists"                        "$PLUGIN_ROOT/agents"
check_dir  "hooks/ exists"                         "$PLUGIN_ROOT/hooks"
check_dir  "scripts/ exists"                       "$PLUGIN_ROOT/scripts"

echo ""
echo "--- Plugin Manifests ---"
check           "plugin.json exists"        "$PLUGIN_ROOT/.claude-plugin/plugin.json"
check           "marketplace.json exists"   "$PLUGIN_ROOT/.claude-plugin/marketplace.json"
check_json_field "plugin.json has 'name'"    "$PLUGIN_ROOT/.claude-plugin/plugin.json" "name"
check_json_field "plugin.json has 'version'" "$PLUGIN_ROOT/.claude-plugin/plugin.json" "version"

echo ""
echo "--- Main Skill ---"
check              "SKILL.md exists"                    "$PLUGIN_ROOT/skills/ssdlc-plan/SKILL.md"
check_frontmatter  "SKILL.md has 'name' frontmatter"    "$PLUGIN_ROOT/skills/ssdlc-plan/SKILL.md" "name"
check_frontmatter  "SKILL.md has 'description'"          "$PLUGIN_ROOT/skills/ssdlc-plan/SKILL.md" "description"

# Check that SKILL.md references all 6 phases
for phase in 0 1 2 3 4 5 6 7; do
  if grep -q "Phase $phase" "$PLUGIN_ROOT/skills/ssdlc-plan/SKILL.md"; then
    green "SKILL.md references Phase $phase"
    ((PASS++))
  else
    red "SKILL.md missing Phase $phase reference"
    ((FAIL++))
  fi
done

# Check that SKILL.md references TodoWrite/task tracking
if grep -q "TodoWrite\|Task [0-9]" "$PLUGIN_ROOT/skills/ssdlc-plan/SKILL.md"; then
  green "SKILL.md includes task tracking"
  ((PASS++))
else
  red "SKILL.md missing task tracking instructions"
  ((FAIL++))
fi

# Check resume capability
if grep -q "resume\|Resume\|ssdlc-working" "$PLUGIN_ROOT/skills/ssdlc-plan/SKILL.md"; then
  green "SKILL.md includes resume capability"
  ((PASS++))
else
  red "SKILL.md missing resume capability"
  ((FAIL++))
fi

echo ""
echo "--- Reference Files ---"
check "socratic-protocol.md exists"  "$PLUGIN_ROOT/skills/ssdlc-plan/references/socratic-protocol.md"
check "stride-template.md exists"    "$PLUGIN_ROOT/skills/ssdlc-plan/references/stride-template.md"
check "output-template.md exists"    "$PLUGIN_ROOT/skills/ssdlc-plan/references/output-template.md"
check "recon-protocol.md exists"       "$PLUGIN_ROOT/skills/ssdlc-plan/references/recon-protocol.md"
check "transcript-protocol.md exists"  "$PLUGIN_ROOT/skills/ssdlc-plan/references/transcript-protocol.md"

echo ""
echo "--- Agents ---"
check              "intent-extractor.md exists"              "$PLUGIN_ROOT/agents/intent-extractor.md"
check_frontmatter  "intent-extractor has 'name'"              "$PLUGIN_ROOT/agents/intent-extractor.md" "name"
check_frontmatter  "intent-extractor has 'tools'"             "$PLUGIN_ROOT/agents/intent-extractor.md" "tools"
check              "appsec-reviewer.md exists"               "$PLUGIN_ROOT/agents/appsec-reviewer.md"
check_frontmatter  "appsec-reviewer has 'name'"               "$PLUGIN_ROOT/agents/appsec-reviewer.md" "name"
check_frontmatter  "appsec-reviewer has 'model'"              "$PLUGIN_ROOT/agents/appsec-reviewer.md" "model"
check              "review-compiler.md exists"               "$PLUGIN_ROOT/agents/review-compiler.md"
check_frontmatter  "review-compiler has 'name'"               "$PLUGIN_ROOT/agents/review-compiler.md" "name"
check_frontmatter  "review-compiler has 'tools'"              "$PLUGIN_ROOT/agents/review-compiler.md" "tools"
check              "product-evaluator.md exists"              "$PLUGIN_ROOT/agents/product-evaluator.md"
check_frontmatter  "product-evaluator has 'name'"              "$PLUGIN_ROOT/agents/product-evaluator.md" "name"
check_frontmatter  "product-evaluator has 'tools'"             "$PLUGIN_ROOT/agents/product-evaluator.md" "tools"

echo ""
echo "--- Hooks ---"
check "hooks.json exists"              "$PLUGIN_ROOT/hooks/hooks.json"
check "capture-session-id.py exists"   "$PLUGIN_ROOT/scripts/hooks/capture-session-id.py"

# Validate hooks.json is valid JSON
if python3 -c "import json; json.load(open('$PLUGIN_ROOT/hooks/hooks.json'))" 2>/dev/null; then
  green "hooks.json is valid JSON"
  ((PASS++))
else
  red "hooks.json is invalid JSON"
  ((FAIL++))
fi

echo ""
echo "--- Config ---"
check "config.json exists"  "$PLUGIN_ROOT/config.json"
if python3 -c "import json; json.load(open('$PLUGIN_ROOT/config.json'))" 2>/dev/null; then
  green "config.json is valid JSON"
  ((PASS++))
else
  red "config.json is invalid JSON"
  ((FAIL++))
fi

echo ""
echo "--- Cross-References ---"
# Check that SKILL.md references both subagents
for agent in product-evaluator intent-extractor appsec-reviewer review-compiler; do
  if grep -q "$agent" "$PLUGIN_ROOT/skills/ssdlc-plan/SKILL.md"; then
    green "SKILL.md references agent '$agent'"
    ((PASS++))
  else
    red "SKILL.md does not reference agent '$agent'"
    ((FAIL++))
  fi
done

# Check that SKILL.md references all reference files
for ref in socratic-protocol stride-template output-template recon-protocol; do
  if grep -q "$ref" "$PLUGIN_ROOT/skills/ssdlc-plan/SKILL.md"; then
    green "SKILL.md references '$ref'"
    ((PASS++))
  else
    red "SKILL.md does not reference '$ref'"
    ((FAIL++))
  fi
done

echo ""
echo "--- Optional ---"
if [[ -f "$PLUGIN_ROOT/examples/sample-brief.md" ]]; then
  green "Sample brief exists"
  ((PASS++))
else
  yellow "No sample brief at examples/sample-brief.md"
  ((WARN++))
fi

if [[ -f "$PLUGIN_ROOT/CLAUDE.md" ]]; then
  green "CLAUDE.md exists"
  ((PASS++))
else
  yellow "No CLAUDE.md"
  ((WARN++))
fi

echo ""
echo "==========================================="
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"
echo "==========================================="

if [[ $FAIL -gt 0 ]]; then
  exit 1
else
  echo ""
  green "Plugin structure is valid!"
  exit 0
fi
