#!/usr/bin/env bash
# Notify #pull-requests on Slack after a successful `gh pr create`.
#
# Set SLACK_PULL_REQUESTS_WEBHOOK_URL in your environment or in .env.local.
# Create the webhook in Slack: Apps → Incoming Webhooks → add to #pull-requests.

set -euo pipefail

input=$(cat)

command=$(echo "$input" | jq -r '.command // empty')
output=$(echo "$input" | jq -r '.output // .stdout // empty')
cwd=$(echo "$input" | jq -r '.cwd // empty')

if [[ -z "$command" ]] || [[ "$command" != *"gh pr create"* ]]; then
  echo '{}'
  exit 0
fi

pr_url=$(echo "$output" | grep -Eo 'https://github\.com/[^[:space:]]+/pull/[0-9]+' | head -1 || true)
if [[ -z "$pr_url" ]]; then
  echo '{}'
  exit 0
fi

load_webhook_url() {
  if [[ -n "${SLACK_PULL_REQUESTS_WEBHOOK_URL:-}" ]]; then
    echo "$SLACK_PULL_REQUESTS_WEBHOOK_URL"
    return
  fi

  local env_file=".env.local"
  if [[ -n "$cwd" && -f "$cwd/.env.local" ]]; then
    env_file="$cwd/.env.local"
  elif [[ ! -f "$env_file" ]]; then
    return 1
  fi

  local value
  value=$(grep -E '^SLACK_PULL_REQUESTS_WEBHOOK_URL=' "$env_file" | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
  if [[ -n "$value" ]]; then
    echo "$value"
  else
    return 1
  fi
}

webhook_url=$(load_webhook_url || true)
if [[ -z "${webhook_url:-}" ]]; then
  echo '{}' >&2
  exit 0
fi

work_dir="${cwd:-.}"
if [[ ! -d "$work_dir" ]]; then
  work_dir="."
fi

branch=$(git -C "$work_dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
author=$(git -C "$work_dir" config user.name 2>/dev/null || echo "unknown")
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || basename "$work_dir")

title=""
if [[ "$command" =~ --title[[:space:]]+\"([^\"]+)\" ]]; then
  title="${BASH_REMATCH[1]}"
elif [[ "$command" =~ --title[[:space:]]+\'([^\']+)\' ]]; then
  title="${BASH_REMATCH[1]}"
elif [[ "$command" =~ --title[[:space:]]+([^[:space:]]+) ]]; then
  title="${BASH_REMATCH[1]}"
fi

if [[ -z "$title" ]]; then
  title="$branch"
fi

payload=$(jq -n \
  --arg title "$title" \
  --arg branch "$branch" \
  --arg author "$author" \
  --arg repo "$repo" \
  --arg url "$pr_url" \
  '{
    text: ("New pull request: " + $title),
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "New pull request", emoji: true }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: ("*Title*\n" + $title) },
          { type: "mrkdwn", text: ("*Branch*\n`" + $branch + "`") },
          { type: "mrkdwn", text: ("*Author*\n" + $author) },
          { type: "mrkdwn", text: ("*Repo*\n" + $repo) }
        ]
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View pull request", emoji: true },
            url: $url,
            style: "primary"
          }
        ]
      }
    ]
  }')

curl -sS -X POST "$webhook_url" \
  -H 'Content-Type: application/json' \
  -d "$payload" \
  >/dev/null || true

echo '{}'
exit 0
