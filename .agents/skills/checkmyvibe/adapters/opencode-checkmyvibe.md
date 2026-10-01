---
description: Run a checkmyvibe production readiness audit. Optional scope argument: secrets | auth | db | backend | frontend | payment (empty = full audit).
---

$ARGUMENTS

Run the checkmyvibe production readiness and code quality audit.

First, locate the checkmyvibe skill file `SKILL.md`. Check these paths in order:

1. `.claude/skills/checkmyvibe/SKILL.md` (project-level install)
2. `~/.claude/skills/checkmyvibe/SKILL.md` (global install)
3. If neither exists, search the working directory for a file named `SKILL.md` whose frontmatter contains `name: checkmyvibe`

Read it in full and follow it completely: scope selection, checks, scripts, evidence/confidence rules, severity rubric, report format, post-fix verification, and final summary structure.

**Scope handling:** interpret `$ARGUMENTS` above as the scope keyword plus an optional target directory (e.g. `secrets src/`). Valid scopes: `secrets`, `auth`, `db`, `backend`, `frontend`, `payment`. No arguments means a full audit across all checks (1a, 1b, 2, 3, 4, 5, 6, 7). Run only the checks mapped to the chosen scope in SKILL.md's scope table and list skipped checks in the final summary.

Helper scripts live in the `scripts/` folder next to SKILL.md. They are Python 3: try `python <script> <target>` first; if `python` is not found, retry with `python3`.
