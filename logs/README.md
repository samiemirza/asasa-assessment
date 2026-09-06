# Build record

This folder is the "build record" the assessment asks for. It is produced automatically while Claude Code works in this repo.

| Path | What | How it gets there |
|---|---|---|
| `DEVLOG.md` | Human-readable narrative: what was tried, what worked, dead ends, decisions | Written by the agent at each milestone via `scripts/devlog/note.sh` |
| `agent/prompts.jsonl` | Every prompt the human sent | `UserPromptSubmit` hook |
| `agent/tool-calls.jsonl` | Every tool call (pre) and its result (post): shell commands, file reads/edits, web fetches | `PreToolUse` / `PostToolUse` hooks |
| `agent/sessions.jsonl` | Session start/stop markers | `SessionStart` / `Stop` hooks |
| `transcripts/<session>.jsonl` + `.md` | The complete raw Claude Code transcript for each session, plus a readable Markdown rendering | `scripts/devlog/export-transcript.sh` (run before submitting) |

Hooks are registered in `.claude/settings.json` (committed, so anyone cloning the repo gets the same harness). Log lines are truncated at 6,000 characters per field; the full text lives in `transcripts/`.

**Redaction.** `scripts/devlog/_redact.sh` strips JWTs, Supabase/Vercel/GitHub/OpenAI-style tokens, Postgres DSNs, `*_KEY=`/`*_SECRET=` assignments and `Bearer` tokens before anything is written. Dead ends are intentionally left in, per the brief.

**Note on the first session.** The hooks were installed part-way through the first session (during planning), so `agent/*.jsonl` starts from that point. The `transcripts/` export covers the whole session from the first message, including the research that preceded the harness.
