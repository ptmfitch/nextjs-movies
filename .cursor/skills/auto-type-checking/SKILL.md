---
name: auto-type-checking
description: Fix TypeScript errors reported by the project type-check hook after editing .ts/.tsx files.
user-invocable: true
---

# Auto Type Checking

`.cursor/hooks/check-types.py` runs `tsc --noEmit` after agent `Write`/`StrReplace` on `.ts`/`.tsx` files and injects errors into context. Fix reported errors before continuing. Path aliases are in `tsconfig.json`.

## Common fixes

| Error | Action |
|-------|--------|
| `Cannot find name 'X'` | Add import |
| Type mismatch | Fix value or annotation |
| Missing property | Update interface or access |
| `Object is possibly 'null'` | Null check or `?.` |
