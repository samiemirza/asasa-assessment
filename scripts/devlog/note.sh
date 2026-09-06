#!/usr/bin/env bash
# Append a timestamped entry to logs/DEVLOG.md.  Usage: scripts/devlog/note.sh "what happened"   (or pipe text on stdin)
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
. "$ROOT/scripts/devlog/_redact.sh"
FILE="$ROOT/logs/DEVLOG.md"
TS="$(date "+%Y-%m-%d %H:%M %Z")"
if [ $# -gt 0 ]; then MSG="$*"; else MSG="$(cat)"; fi
printf '\n### %s\n%s\n' "$TS" "$(redact "$MSG")" >> "$FILE"
echo "logged → logs/DEVLOG.md"
