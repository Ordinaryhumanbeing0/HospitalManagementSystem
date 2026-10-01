# checkmyvibe — AGENTS.md snippet

Paste the section below into your project's `AGENTS.md` (or the global one, e.g.
`~/.codex/AGENTS.md`, `~/.gemini/GEMINI.md`). This makes any agent that reads
AGENTS.md — Codex CLI, Gemini CLI, Cursor, opencode, Antigravity, and others —
able to discover and run checkmyvibe.

---

## checkmyvibe (production readiness & code quality audit)

When the user asks to "check my vibe", run a production readiness check, review
code quality, do a pre-ship sanity check, check for exposed environment variables,
check launch readiness, or asks for a scoped check (`secrets`, `auth`, `db`,
`backend`, `frontend`, `payment`) — use the checkmyvibe skill:

1. Locate its instructions file `SKILL.md` by checking, in order:
   - `.claude/skills/checkmyvibe/SKILL.md`
   - `~/.claude/skills/checkmyvibe/SKILL.md`
   - Search the repo for a `SKILL.md` whose frontmatter contains `name: checkmyvibe`
2. Read it fully and follow every instruction: scope selection, all applicable
   checks, evidence/confidence rules, severity rubric, report format, and final summary.
3. Run helper scripts from the `scripts/` folder next to SKILL.md where the skill
   directs you to (Checks 1–4 and Check 7). They are Python 3: try `python <script> <target>`,
   and if not found retry with `python3`.
4. If no scope is specified, run the full audit (all checks).

Scopes map to checks exactly as defined in SKILL.md's "Scope selection" table:
`secrets` = 1a+1b+2 · `auth` = 3 · `db` = 4 · `backend` = 1a+3+4+5+6(server)+7(server)
· `frontend` = 1b+3(client)+7(client) · `payment` = 7 · full = everything.
