---
name: git-report-workflow
description: Use when working on this repository's Git ingestion, branch selection, report generation, Markdown export, or OpenAI-compatible summarization flow.
---

# Git Report Workflow

Use this skill when the task touches Git synchronization, commit parsing, reporting logic, or report export in this repository.

## Workflow

1. Read `src/lib/git.ts`, `src/lib/project-service.ts`, and `src/lib/reporting.ts` before changing behavior.
2. Keep Git collection grounded in CLI output from the bundled Git binary when system Git is unavailable.
3. Preserve the two-stage report flow:
   - collect structured facts from commits first
   - generate Markdown from those facts second
4. If AI generation fails or config is incomplete, preserve the fallback Markdown path.

## Guardrails

- Do not invent commit facts or metrics.
- Keep report sections stable: 周期信息、提交统计、重点变更、风险/阻塞、下一步建议、原始提交引用列表。
- Any schema change must be reflected in `prisma/schema.prisma`, API routes, and UI forms.

## Validation

- Run `pnpm test` after touching `src/lib/git.ts`, `src/lib/reporting.ts`, or `src/lib/project-service.ts`.
- If branch filtering logic changes, add or update unit tests.
