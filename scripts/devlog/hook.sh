#!/usr/bin/env bash
# Claude Code hook receiver. Appends one redacted JSON line per event to logs/agent/*.jsonl.
# Registered in .claude/settings.json for PreToolUse, PostToolUse, UserPromptSubmit, SessionStart, Stop.
# Never blocks the agent: always exits 0.
set -u
PHASE="${1:-unknown}"
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
LOGDIR="$ROOT/logs/agent"
mkdir -p "$LOGDIR" 2>/dev/null || exit 0
# shellcheck source=_redact.sh
. "$ROOT/scripts/devlog/_redact.sh"
INPUT="$(cat 2>/dev/null || true)"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
case "$PHASE" in
  pre|post) FILE="$LOGDIR/tool-calls.jsonl" ;;
  prompt)   FILE="$LOGDIR/prompts.jsonl" ;;
  *)        FILE="$LOGDIR/sessions.jsonl" ;;
esac
LINE="$(printf '%s' "$INPUT" | jq -c --arg ts "$TS" --arg ph "$PHASE" '
  def trunc: if type=="string" and length>6000 then .[:6000] + "…[truncated \(length-6000) chars]" else . end;
  def shrink: if type=="object" then with_entries(.value |= (if type=="string" then trunc elif type=="array" then map(trunc) else . end))
              elif type=="string" then trunc elif type=="array" then map(trunc) else . end;
  { ts:$ts, phase:$ph, event:.hook_event_name, session:.session_id, cwd:.cwd,
    tool:.tool_name, tool_use_id:.tool_use_id,
    input:(.tool_input // null | shrink),
    response:(.tool_response // null | shrink),
    prompt:(.prompt // null | trunc),
    source:.source, reason:.reason, stop_hook_active:.stop_hook_active }
  | with_entries(select(.value != null))' 2>/dev/null || true)"
if [ -z "$LINE" ]; then
  LINE="$(jq -cn --arg ts "$TS" --arg ph "$PHASE" --arg raw "$(printf '%s' "$INPUT" | head -c 6000)" '{ts:$ts,phase:$ph,raw:$raw}')"
fi
printf '%s\n' "$(redact "$LINE")" >> "$FILE"
exit 0
