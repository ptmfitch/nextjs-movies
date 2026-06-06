#!/usr/bin/env python3
"""Ask for approval before destructive shell commands run."""

from __future__ import annotations

import json
import re
import sys

# (regex, human-readable reason)
DESTRUCTIVE_PATTERNS: list[tuple[str, str]] = [
    # File deletion
    (r"\brm\b", "rm command"),
    (r"\bunlink\b", "unlink command"),
    (r"\bshred\b", "shred command"),
    (r"\bfind\b.*\s-delete\b", "find -delete"),
    (r"\btruncate\b.*\s-s\s+0\b", "truncate to zero"),
    # Git destructive / deletion
    (r"\bgit\s+reset\b.*--hard\b", "git reset --hard"),
    (r"\bgit\s+clean\b", "git clean"),
    (r"\bgit\s+branch\b.*(-D|--delete\s+--force)\b", "git branch force delete"),
    (r"\bgit\s+branch\b.*\s-d\s+", "git branch delete"),
    (r"\bgit\s+push\b.*(--force|-f)\b", "git force push"),
    (r"\bgit\s+push\b.*:\S+", "git remote branch deletion"),
    (r"\bgit\s+rm\b", "git rm"),
    (r"\bgit\s+stash\b.*\s(drop|clear)\b", "git stash drop/clear"),
    (r"\bgit\s+filter-branch\b", "git filter-branch"),
    (r"\bgit\s+filter-repo\b", "git filter-repo"),
    (r"\bgit\s+worktree\b.*\sremove\b.*--force\b", "git worktree force remove"),
    (r"\bgit\s+tag\b.*\s-d\b", "git tag delete"),
    (r"\bgit\s+checkout\b.*--\s", "git checkout discard changes"),
    (r"\bgit\s+restore\b", "git restore (discards local changes)"),
]

CHAIN_SPLIT = re.compile(r"\s*(?:&&|\|\||;)\s*")
ENV_PREFIX = re.compile(r"^(?:\w+=\S*\s+)+")


def split_commands(command: str) -> list[str]:
    return [segment.strip() for segment in CHAIN_SPLIT.split(command) if segment.strip()]


def normalize_segment(segment: str) -> str:
    return ENV_PREFIX.sub("", segment).strip()


def find_violation(command: str) -> str | None:
    for segment in split_commands(command):
        normalized = normalize_segment(segment)
        if not normalized:
            continue
        for pattern, reason in DESTRUCTIVE_PATTERNS:
            if re.search(pattern, normalized, re.IGNORECASE):
                return reason
    return None


def allow() -> None:
    print(json.dumps({"permission": "allow"}))


def ask(reason: str) -> None:
    print(
        json.dumps(
            {
                "permission": "ask",
                "user_message": (
                    f"This command looks destructive ({reason}). "
                    "Approve only if you intend to run it."
                ),
                "agent_message": (
                    f"This command was flagged by the destructive-ops hook ({reason}). "
                    "Wait for the user to approve before retrying."
                ),
            }
        )
    )


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        allow()
        return 0

    command = payload.get("command") or ""
    if not isinstance(command, str) or not command.strip():
        allow()
        return 0

    violation = find_violation(command)
    if violation:
        ask(violation)
        return 0

    allow()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
