# /checkmyvibe-secrets — Exposed secrets & .gitignore hygiene

First, locate the checkmyvibe skill file `SKILL.md`. Check these paths in order:

1. `.claude/skills/checkmyvibe/SKILL.md` (project-level install)
2. `~/.claude/skills/checkmyvibe/SKILL.md` (global install)
3. If neither exists, search the working directory for a file named `SKILL.md` whose frontmatter contains `name: checkmyvibe`

Use SKILL.md **only** for the report format, severity rubric, and final-summary structure. The complete operating instructions for this scope are below — follow them even if SKILL.md cannot be found.

**Optional argument:** a target directory may be passed after the command. Default to the project root if not given. Scripts live in the `scripts/` folder next to SKILL.md.

## Scope

This is a **secrets-only check**: Check 1a (server-side secrets) + Check 1b (client-exposed secrets) + Check 2 (.gitignore hygiene). Checks 3–7 are skipped and must be listed as skipped in the final summary.

## Step 1 — Run both scripts

```bash
python <skill_dir>/scripts/scan_secrets.py <target>
python <skill_dir>/scripts/check_gitignore.py <target>
```

If Python is unavailable or a script fails, say so explicitly in the report ("automated secret scan could not run; manually reviewed instead") and do the equivalent manually: grep for key prefixes (`sk-proj-`, `sk-ant-`, `gsk_`, `re_`, `sk_live_`, `sk_test_`, `AIza`, `AKIA`, `ghp_`, `xox[bp]-`), JWT tokens with `service_role`, database URIs, and literal assignments to names containing `key`, `secret`, `token`, `password`.

## Step 2 — Triage every script finding

The scripts over-match on purpose. For each hit, open the file and decide:

- **OpenAI Project Keys (`sk-proj-...`, `sk-None-...`)** → **Critical**. Charges API accounts. Revoke immediately at platform.openai.com.
- **Anthropic Claude Keys (`sk-ant-api03-...`)** → **Critical**. Charges API usage. Revoke at console.anthropic.com.
- **Groq (`gsk_...`), Perplexity (`pplx-...`), HuggingFace (`hf_...`)** → **Critical**. Revoke at provider consoles.
- **Resend Email Keys (`re_...`)** → **Critical**. Used for phishing and mass spam abuse under your domain.
- **Supabase `service_role` JWT (containing `"role":"service_role"`)** → **Critical**. Completely bypasses Row-Level Security across all tables.
- **Database Connection URIs with passwords** (`postgres://...:...@...`, `mongodb+srv://...`) → **Critical**. Direct database access.
- **Live Stripe key (`sk_live_...`)** → **Critical**. Charges real cards. Recommend immediate rotation at dashboard.stripe.com.
- **Test Stripe key (`sk_test_...`) in source** → **Should Fix**. Must not be committed; rotate if repo was ever shared/pushed publicly.
- **AWS `AKIA`, Google `AIza`, GitHub `ghp_`, Slack tokens in source** → **Critical**.
- **Publishable keys (`pk_live`, `pk_test`, Supabase anon keys, Firebase apiKey config)** → **NOT findings**. These are public-by-design; note this distinction so the user isn't confused.
- **Placeholders** (`your-api-key-here`, `<secret>`, dummy values) → not findings.
- Anything inside test/fixture/mock directories → not findings (scripts skip these).

## Step 3 — Client-exposure pass (Check 1b)

Verify secrets aren't reachable from the browser:

- Grep frontend code (`src/`, `app/`, `components/`, `pages/`, `public/`, client entry points) for references to secret env vars or service-role keys.
- **Bundler Prefixes:** In Next.js, Vite, CRA, Expo: any secret placed behind `NEXT_PUBLIC_*`, `VITE_*`, `REACT_APP_*`, `EXPO_PUBLIC_*` gets bundled into shipped browser JavaScript → **Critical**.
- **React Server Component (RSC) prop leaks:** In Next.js App Router, check if a Server Component imports a private secret and passes it as a prop to a client component (`<ClientComponent apiKey={process.env.PRIVATE_KEY} />`). Next.js serializes props into the client payload JSON → **Critical**.
- Supabase `service_role` key, Firebase admin SDK private key JSON, OpenAI/Stripe/Anthropic secret keys appearing anywhere client-reachable → **Critical**.

## Step 4 — .gitignore & Docker hygiene (Check 2)

From `check_gitignore.py` output plus manual review:

- `.env`, `.env.local`, `.env.production` present but not ignored in `.gitignore` → **Critical** regardless of contents.
- **Docker risk:** If a `Dockerfile` exists and `.env` is omitted from `.dockerignore` → **Critical** (bakes secret environment files into public container image layers).
- **NPM auth tokens:** `.npmrc` files containing `_authToken=` committed in git → **Critical**.
- Run `git log --all --full-history -- .env` (if git available). If `.env` was ever committed → **Critical**, and state plainly: removing it now is not enough; every secret in git history must be rotated because git history remains permanently recoverable.

## Report

Use the format, severity rubric, and final-summary structure from SKILL.md. Scope reminder for this run: "secrets-only check — Checks 3 (auth), 4 (db), 5 (IDOR), 6 (inputs), and 7 (payments) were skipped. This does not mean the app is secure. Run a full `/checkmyvibe` audit before launch."
