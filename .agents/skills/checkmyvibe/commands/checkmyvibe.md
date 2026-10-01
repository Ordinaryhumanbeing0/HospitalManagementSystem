# /checkmyvibe — Full production readiness audit

First, locate the checkmyvibe skill file `SKILL.md`. Check these paths in order:

1. `.claude/skills/checkmyvibe/SKILL.md` (project-level install)
2. `~/.claude/skills/checkmyvibe/SKILL.md` (global install)
3. If neither exists, search the working directory for a file named `SKILL.md` whose frontmatter contains `name: checkmyvibe`

If it still cannot be found, tell the user and stop — do not improvise an audit without the skill definitions.

**Optional argument:** a target directory may be passed after the command (e.g. `/checkmyvibe src/`). Default to the project root if not given.

Then read `SKILL.md` in full and run the **complete audit: Checks 1a, 1b, 2, 3, 4, 5, 6, and 7**:

- Check 1a — server-side secrets and credentials (OpenAI, Anthropic, Groq, Resend, Supabase service-role JWTs, database URIs, Stripe, cloud keys)
- Check 1b — client-exposed secrets & RSC server-to-client prop leaks
- Check 2 — .gitignore and .dockerignore hygiene (including git-history check for committed `.env` and `.npmrc`)
- Check 3 — missing or fake authentication (mock user returns, no-op `next()` stubs, Clerk matcher holes, NextAuth secrets, Supabase `getUser`)
- Check 4 — database misconfiguration (Supabase RLS, Firebase rules, Neon pooling/SSL, Prisma/Drizzle schema checks, public SQLite files, MongoDB injection)
- Check 5 — broken object-level authorization (IDOR/BOLA across REST routes, Next.js Server Actions, tRPC, and multi-tenant org boundaries)
- Check 6 — unvalidated inputs (SSRF in AI link/image scrapers, SQLi, NoSQL injection, DOM XSS in AI markdown, mass assignment, CORS wildcards, rate limiting)
- Check 7 — client-side payment logic, webhook signature verification (Stripe, Lemon Squeezy, Dodo Payments, Polar, Paddle, Razorpay), webhook idempotency, and subscription lifecycle handling

Run every script in the skill's `scripts/` folder (`scan_secrets.py`, `check_gitignore.py`, `check_auth_patterns.py`, `check_db_config.py`, `check_payment_config.py`) against the target directory before relying on your own reasoning. If Python is unavailable or a script fails, state that explicitly in the report and do the check manually instead of silently skipping it.

Use the report format, severity rubric, evidence/confidence rules, post-fix verification step, and full-audit final summary structure defined in `SKILL.md`.
