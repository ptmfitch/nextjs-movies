---
name: creating-pr
description: Create a review-ready pull request with conventional title, structured description, and self-review checklist.
user-invocable: true
---

# Creating a PR

## 1. Prepare branch

```bash
git fetch origin
git log origin/main..HEAD --oneline
git diff origin/main --stat
```

Rebase or merge per project convention before pushing.

## 2. Title

`<type>: <description>` — `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`.

## 3. Description

```markdown
## Summary
What and why (1–3 sentences). Closes #123

## Changes
- Bullet list of notable changes

## Test plan
- [ ] Checklist of manual verification steps
```

## 4. Self-review

- Read full diff; remove debug code
- `npm run test:run`
- `npx tsc --noEmit`
- `npm run lint`
- No `.env.local` or secrets in diff
- UI changes: run `verifying-in-browser` skill or attach screenshots

## 5. Create

```bash
git push -u origin HEAD
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
...

## Changes
...

## Test plan
...
EOF
)"
```

## Tips

- Aim for <300 lines changed; split large PRs.
- Note dependent PRs in the description.
