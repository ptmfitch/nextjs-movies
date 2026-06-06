---
name: verifying-in-browser
description: Start the dev server, open the app in Cursor's built-in browser, and verify rendering, console errors, network health, and visual layout. Use after UI, data-fetching, or config changes — replaces a separate visual-QA pass.
---

# Verify in Browser

Smoke-test and visually QA the app after changes. Do not assume code is correct — launch and check.

## 1. Dev server

Check terminals for an existing `npm run dev`. If none, start in background:

```bash
npm run dev
```

Poll until localhost URL appears (default `http://localhost:3000`).

## 2. Navigate

```
Tool: browser_navigate
Arguments: { "url": "http://localhost:3000", "position": "side", "take_screenshot_afterwards": true }
```

Navigate to the specific route if changes are not on `/`.

## 3. Health checks

**Console** — `browser_console_messages`. Flag errors; note warnings only.

**Network** — `browser_network_requests`. Flag 4xx/5xx, failed fetches, CORS errors. Poster images from external hosts often fail — report broken poster URLs.

**Visual** — review screenshot for layout breaks, missing content, wrong colors, stuck loaders.

For deeper visual QA: `browser_take_screenshot` with `{ "fullPage": true }`, or `browser_resize` for responsive breakpoints.

## 4. Interactions

For forms, buttons, or search (`SearchBar`):

1. `browser_snapshot` for element refs
2. `browser_click` / `browser_fill` / `browser_hover`
3. Screenshot again to confirm

Test search: submit a query (`/?q=...`), clear, empty submit.

## 5. Report

- **Pass**: page renders, console clean, network healthy (or only expected poster failures).
- **Fail**: list each issue with route and repro steps.

## When to use

- After component, CSS, layout, or MongoDB data-flow changes
- After env or dependency changes
- Before opening a PR (pair with `creating-pr` skill)
