---
name: auto-type-checking
description: Run TypeScript type checking after editing .ts/.tsx files and fix errors before moving on. Optional Cursor hook for automation.
user-invocable: true
---

# Auto Type Checking

## After edits

```bash
npx tsc --noEmit 2>&1 | head -30
```

Fix errors before continuing. Path aliases are in `tsconfig.json`.

## Common fixes

| Error | Action |
|-------|--------|
| `Cannot find name 'X'` | Add import |
| Type mismatch | Fix value or annotation |
| Missing property | Update interface or access |
| `Object is possibly 'null'` | Null check or `?.` |

## Optional hook

`.cursor/hooks.json`:

```json
{
  "hooks": [
    {
      "event": "afterFileEdit",
      "script": "check-types.sh",
      "pattern": "**/*.{ts,tsx}"
    }
  ]
}
```

`.cursor/hooks/check-types.sh`:

```bash
#!/bin/bash
npx tsc --noEmit --pretty 2>&1 | head -20
exit 0
```

```bash
chmod +x .cursor/hooks/check-types.sh
```

Also run `npx tsc --noEmit` in the `creating-pr` self-review checklist.
