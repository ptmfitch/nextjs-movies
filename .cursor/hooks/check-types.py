#!/usr/bin/env python3
"""Inject TypeScript errors into agent context after .ts/.tsx file edits."""

from __future__ import annotations

import json
import subprocess
import sys

TS_EXTENSIONS = (".ts", ".tsx")
MAX_LINES = 20
WRITE_TOOLS = frozenset({"Write", "StrReplace"})


def is_ts_file(path: str) -> bool:
    return path.endswith(TS_EXTENSIONS)


def edited_file_path(payload: dict) -> str | None:
    tool_name = payload.get("tool_name")
    if tool_name not in WRITE_TOOLS:
        return None

    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        return None

    for key in ("path", "file_path", "target_file"):
        path = tool_input.get(key)
        if isinstance(path, str) and path:
            return path
    return None


def run_tsc() -> str:
    result = subprocess.run(
        ["npx", "tsc", "--noEmit", "--pretty"],
        capture_output=True,
        text=True,
        check=False,
    )
    output = "\n".join(
        line for line in (result.stdout + result.stderr).splitlines() if line.strip()
    )
    if result.returncode == 0 or not output:
        return ""
    return "\n".join(output.splitlines()[:MAX_LINES])


def respond(additional_context: str | None = None) -> None:
    if additional_context:
        print(json.dumps({"additional_context": additional_context}))
    else:
        print("{}")


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        respond()
        return 0

    path = edited_file_path(payload)
    if not path or not is_ts_file(path):
        respond()
        return 0

    errors = run_tsc()
    if errors:
        respond(
            f"TypeScript errors after editing {path}. Fix before continuing:\n\n{errors}"
        )
    else:
        respond()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
