---
name: frontend-qa
description: Use when working on this repository's dashboard UX, forms, report pages, or Playwright smoke coverage.
---

# Frontend QA

Use this skill when adjusting UI, page layout, interaction states, or end-to-end verification for this repository.

## Workflow

1. Preserve the current visual language: warm paper background, strong typography, and glass panels.
2. Keep the main task flow visible from the UI:
   - create project
   - sync repository
   - generate report
   - view or download Markdown
3. Use `startTransition` for network-triggering interactions.
4. If you add fields to project configuration, update both the create form and edit form states.

## Validation

- Run `pnpm lint` after editing components or pages.
- When possible, run `pnpm test:e2e` or at least keep `tests/e2e/report-flow.spec.ts` aligned with the UI text.
