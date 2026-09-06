#!/usr/bin/env bash
# Shared secret redaction for build-record logs. Usage: redact "$string"  |  redact_stream < file
_REDACT_SED=(
  -e 's/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/[REDACTED_JWT]/g'
  -e 's/(sbp_|sb_secret_|sb_publishable_|sk-|sk_live_|sk_test_|ghp_|gho_|github_pat_|vcp_|xoxb-|xoxp-|AKIA)[A-Za-z0-9_-]{8,}/\1[REDACTED]/g'
  -e 's#(postgres(ql)?://)[^[:space:]"'"'"'\\]+#\1[REDACTED_DSN]#g'
  -e 's/([A-Za-z_]*(SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|APIKEY|SERVICE_ROLE|PRIVATE_KEY|ANON_KEY|ACCESS_KEY)[A-Za-z_]*)([[:space:]]*[=:][[:space:]]*\\?"?)[A-Za-z0-9._~+\/=-]{8,}/\1\3[REDACTED]/g'
  -e 's/(Bearer[[:space:]]+)[A-Za-z0-9._~+\/=-]{16,}/\1[REDACTED]/g'
  -e 's/ep-[a-z0-9-]+\.[a-z0-9.-]*neon\.tech/[REDACTED_NEON_HOST]/g'
)
redact() { printf '%s' "$1" | sed -E "${_REDACT_SED[@]}"; }
redact_stream() { sed -E "${_REDACT_SED[@]}"; }
