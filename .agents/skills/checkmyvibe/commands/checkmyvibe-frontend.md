# /checkmyvibe-frontend — Client-side audit

First, locate the checkmyvibe skill file `SKILL.md`. Check these paths in order:

1. `.claude/skills/checkmyvibe/SKILL.md` (project-level install)
2. `~/.claude/skills/checkmyvibe/SKILL.md` (global install)
3. If neither exists, search the working directory for a file named `SKILL.md` whose frontmatter contains `name: checkmyvibe`

Use SKILL.md **only** for the report format, severity rubric, and final-summary structure. The complete operating instructions for this scope are below — follow them even if SKILL.md cannot be found.

**Optional argument:** a target directory may be passed after the command. Default to the project root if not given. Scripts live in the `scripts/` folder next to SKILL.md.

## Scope

This is a **frontend-only check**: Check 1b (client-exposed secrets) + Check 3 viewed from the client (UI-only enforcement) + Check 6 viewed from the client (DOM XSS / AI markdown rendering) + Check 7 viewed from the client (client-controlled pricing). Skipped and to be listed as such in the summary: Check 1a standalone triage, Check 2 (.gitignore), Check 4 (db rules), Check 5 (IDOR sweep), and full server-side reviews.

## Step 1 — Client-exposed secrets (run script, then manual pass)

```bash
python <skill_dir>/scripts/scan_secrets.py <target>
```

Then manually inspect everything reachable from the browser:

- **Framework Env Prefixes:** `NEXT_PUBLIC_*`, `VITE_*`, `REACT_APP_*`, `EXPO_PUBLIC_*`. Any secret behind one of these is inlined into shipped JavaScript → **Critical**.
- **React Server Component (RSC) Prop Leaks:** In Next.js App Router, check if a Server Component imports a private secret and passes it as a prop to a client component (`<ClientComponent apiKey={process.env.PRIVATE_KEY} />`). Next.js serializes all props into the client HTML payload → **Critical**.
- Supabase `service_role` key, Firebase admin SDK JSON, OpenAI (`sk-proj-`), Anthropic, or Stripe secret keys anywhere under `src/`, `app/`, `components/`, `pages/`, `public/`, or client entry files → **Critical**.
- Publishable keys (`pk_`, Supabase anon key, Firebase web config `apiKey`) are public-by-design → **NOT findings**; note this explicitly so the user isn't confused.
- Placeholders and test-fixture values → not findings.

## Step 2 — DOM XSS & Unescaped AI Markdown Rendering

AI-generated applications frequently display LLM responses, user bios, or chat logs:

- Inspect components rendering HTML or markdown (`react-markdown`, `marked`, `markdown-it`).
- **Unescaped rendering:** Rendering LLM or user markdown with `dangerouslySetInnerHTML`, `v-html`, or `react-markdown` without `rehype-sanitize` or DOMPurify → **Critical** (an attacker or malicious prompt injection can inject `<script>` tags, `<img onerror=...>`, or iframe exploits directly into users' browsers).

## Step 3 — UI-only auth enforcement (Check 3, client view)

Find every place the UI gates access: redirects on protected pages, hidden nav items, disabled buttons, client route guards:

- For each gated feature, open the corresponding API route/mutation/Server Action and confirm it independently verifies the session server-side. If it does not → **Critical** ("hiding the button does nothing; anyone can call the endpoint directly").
- Auth state trusted purely from client storage (localStorage JWT, global store) to protect data → **Critical** if no server verification exists.
- You must read the server routes to clear or confirm findings — a clean-looking frontend proves nothing on its own.

## Step 4 — Client-controlled pricing (Check 7, client view)

Inspect checkout/cart/pricing flows:

- Prices, discounts, totals, or quantities computed client-side and sent as the chargeable value (hidden form fields, request bodies, query params) → **Critical** on the corresponding server endpoint.
- Coupon codes validated only in the UI → flag the endpoint that accepts them without server-side validation.
- Note exactly which server endpoint accepts the tainted value so the backend fix is obvious.

## Step 5 — Security Headers & Analytics Data Hygiene

- **Clickjacking:** Missing `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors 'none'` allows malicious sites to embed the app in an invisible iframe → **Should Fix**.
- **Analytics PII auto-capture:** Session recording tools (PostHog, Hotjar, LogRocket) capturing private form fields (passwords, credit card numbers, auth tokens) without masking classes (`data-mask` / `ph-no-capture`) → **Should Fix**.

## Report

Use the format, severity rubric, and final-summary structure from SKILL.md. Scope reminder: "frontend-only check — server-side secret triage, .gitignore hygiene, database rules, IDOR, server input validation, and webhook verification were skipped. This does not mean the app is production-ready. Run a full `/checkmyvibe` audit before launch."
