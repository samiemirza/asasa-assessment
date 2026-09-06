#!/usr/bin/env bash
# Export the full Claude Code transcript(s) for this project into logs/transcripts/ (redacted JSONL + readable Markdown).
# Claude Code stores transcripts at ~/.claude/projects/<slug>/<session>.jsonl where <slug> is the project path with
# every non-alphanumeric character replaced by '-'.
set -eu
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$ROOT/scripts/devlog/_redact.sh"
SLUG="$(printf '%s' "$ROOT" | sed -E 's/[^A-Za-z0-9]/-/g')"
SRC="${CLAUDE_TRANSCRIPT_DIR:-$HOME/.claude/projects/$SLUG}"
OUT="$ROOT/logs/transcripts"
mkdir -p "$OUT"
shopt -s nullglob
files=("$SRC"/*.jsonl)
if [ ${#files[@]} -eq 0 ]; then echo "no transcripts found in $SRC" >&2; exit 1; fi
for f in "${files[@]}"; do
  id="$(basename "$f" .jsonl)"
  redact_stream < "$f" > "$OUT/$id.jsonl"
  jq -r '
    select(.type=="user" or .type=="assistant")
    | .timestamp as $t | .message as $m
    | ($m.content | if type=="string" then [{type:"text",text:.}] else . end) as $c
    | $c[]
    | if .type=="text" and (.text|length)>0 then "\n**\($m.role)** · \($t)\n\n\(.text)\n"
      elif .type=="tool_use" then "\n> 🔧 **\(.name)** `\(.input|tostring|.[:2000])`\n"
      elif .type=="tool_result" then
        "\n> ↩ " + ((.content | if type=="string" then . else (map(.text? // "") | join("\n")) end) | .[:2000] | gsub("\n";"\n> ")) + "\n"
      else empty end' "$OUT/$id.jsonl" > "$OUT/$id.md" 2>/dev/null || true
  lines=$(wc -l < "$OUT/$id.jsonl" | tr -d ' ')
  echo "exported $id  ($lines events) → logs/transcripts/$id.{jsonl,md}"
done
