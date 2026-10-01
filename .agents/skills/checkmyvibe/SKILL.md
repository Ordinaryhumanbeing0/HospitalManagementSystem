---
name: checkmyvibe
description: >
  Use this skill when the user asks to "check my vibe", run a production readiness check, review code quality, do a sanity check, check for exposed environment variables, or check if the app is ready to launch/ship, or runs a scoped check like `/checkmyvibe db`, `/checkmyvibe auth`, `/checkmyvibe secrets`, `/checkmyvibe payment`, `/checkmyvibe backend`, or `/checkmyvibe frontend`. Also trigger proactively when the agent is about to help deploy, publish, or push an application live, or when the codebase shows signs of AI-scaffolded patterns (Supabase/Firebase/Neon/Prisma/Drizzle config, Dodo Payments/Lemon Squeezy/Stripe, recently generated boilerplate, auth stubs, no existing verification) and the user has not had one done yet.
---
# checkmyvibe — Production Readiness & Code Quality Check for Vibe-Coded Apps

## Why this skill exists

AI coding tools optimize for "it works," not "it's production-ready." A feature can pass every
manual test a non-technical founder runs — sign up, log in, place an order — and
still leak every other user's data to a stranger who changes one number in a URL.
This happens because AI-generated code frequently ships with scaffolding shortcuts
that were meant to be temporary (a stub auth check, a permissive default database
rule, client-controlled price calculations, unverified webhooks) and never get hardened before launch, precisely because the person building
the app doesn't know those shortcuts exist or what to look for.

Your job when this skill is active: think like an experienced software engineer doing a
pre-launch quality review for a client who has never heard the words "IDOR" or "row-level
security." Find the real, addressable configuration and logic issues. Explain them in plain
language. Give exact fixes. Do not pad the report with theoretical concerns that don't apply
to this specific codebase, and do not skip a check because the codebase "looks simple" —
simple codebases are exactly where stubbed auth and hardcoded secrets hide, because nobody
expected them to hold real user data yet.

## Scope and honesty (read this before writing any report)

This is a first-pass review for known, documented scaffolding failure patterns. It is not a
comprehensive external validation, and it does not cover infrastructure hosting, third-party package
issues, or novel/business-logic-specific flaws outside the categories below. Never tell the user their app is completely "secure" or "safe" in an unqualified way.
The correct language is "no issues found in this pass" or "ready to ship as far as
these checks go" — always paired with the scope reminder in the Final Summary
section. If the app appears to handle payments, health data, or other regulated
data, say explicitly that a professional verification is strongly recommended regardless
of what this pass finds.

## Scope selection

checkmyvibe supports targeted/scoped scanning for rapid iteration during development, as well as full audits before release. When a specific scope or slash command is specified, execute only the mapped checks:

| Scope / Command Keyword | Included Checks | Description / Focus Area |
| :--- | :--- | :--- |
| **`secrets`** | **Check 1a + Check 1b + Check 2** | Server-side and client-exposed credentials, AI API keys, tokens, `.gitignore`, and `.dockerignore` file protection |
| **`auth`** | **Check 3** | Missing, mock, stubbed, or bypassed authentication guards, mock user returns, Clerk matchers, Supabase session checks |
| **`db`** | **Check 4** | Database & BaaS rules: Supabase RLS, Firebase rules, Neon pooling/SSL, Prisma/Drizzle schema hygiene, public SQLite files, NoSQL injection |
| **`backend`** | **Check 1a + Check 3 + Check 4 + Check 5 + Check 6 (server-side) + Check 7 (server-side)** | All server-side logic: hardcoded server credentials, auth guards, database configs, IDOR/BOLA (including Server Actions & multi-tenant), SSRF/SQLi/input validation, mass assignment, and payment/webhook processing |
| **`frontend`** | **Check 1b + Check 3 (client-side view) + Check 6 (DOM XSS / AI markdown) + Check 7 (client-side view)** | Client-side bundle leaks, RSC prop leaks, DOM XSS in AI markdown rendering, UI-only auth hiding, and client-controlled payment/pricing logic |
| **`payment`** | **Check 7** | Client-side payment amount tampering, price overrides, unverified webhooks (Stripe, Dodo Payments, Lemon Squeezy, Polar, Paddle, Razorpay), webhook idempotency, and subscription lifecycle |
| *(no argument / `full`)* | **All Checks (1a–7)** | Full production readiness and code quality audit |

> **Canonical definitions note:** The check definitions in this file are canonical. The scoped command files (`commands/checkmyvibe-*.md`) contain mirrored copies of their relevant checks so they can run standalone. When you change what a check does, update it here AND in every command file that mirrors it.

### Rules for Scoped Runs:
- **Execute only the selected checks:** Do not run unselected check scripts or inspect code outside the chosen scope.
- **Explicit scope transparency:** At the start and in the final summary of the report, clearly state which checks were run and which checks were skipped.
- **No false safety claims:** A clean scoped scan does **not** mean the app is ready for production. State clearly: *"This was a [scope]-only check. Run a full `/checkmyvibe` audit across all categories prior to launch."*

## Before you start

1. **Analyze and understand the whole project first:** Walk the directory tree and analyze the repository configuration files before running any checks, generating findings, or providing instructions. Establish a solid high-level understanding of the architecture, components, and data flow.
2. Identify the stack: what backend/framework (Next.js, Express, FastAPI), what database or BaaS provider (Supabase, Firebase, Neon, AWS RDS, Prisma, Drizzle, MongoDB, local SQLite/Postgres), what auth approach (Clerk, NextAuth, Supabase Auth, Firebase, custom JWT), what payment provider (Stripe, Dodo Payments, Lemon Squeezy, Polar, Paddle, Razorpay). This changes which checks apply and how to phrase findings.
3. Identify what data the app handles: user accounts, payments, health data, messages between users, files. This changes severity judgments — the same missing check is more severe on an app handling payment data than on a toy to-do list.
4. Run the checks below in order. Use the bundled scripts where noted. For everything else, read the actual code — don't rely on file names alone.

---

## Supported stacks to recognize

Common stacks this skill expects include: Next.js (Pages and App Router), Express, FastAPI, Django, Supabase, Firebase, Neon, Prisma, Drizzle, Postgres, MySQL, SQLite, MongoDB/Mongoose, Redis/Upstash, Convex, Clerk, NextAuth/Auth.js, Stripe, Dodo Payments, Lemon Squeezy, Polar.sh, Paddle, Razorpay, Resend, OpenAI/Anthropic/Groq SDKs, and common patterns built around them.

## Evidence and confidence rules

- Only flag something when there is evidence in the code.
- Do not guess from filenames, comments, or variable names alone.
- If something looks suspicious but is not fully proven, mark it with a confidence tag such as `High confidence`, `Medium confidence`, or `Needs manual review`.
- Do not overflag. Prefer one precise finding over several weak or duplicate ones.

## Fix priority

When multiple issues are found, sort them in this order:
Critical user exposure > auth bypass > IDOR > payment logic > config issues > hygiene.

## What success looks like

The report should help the coding agent make the repo safer in the next commit, not just describe problems.

---

## Check 1a: Server-side secrets and credentials

**Run the script** `scripts/scan_secrets.py` (located relative to this `SKILL.md` file) against the project root. It flags known API key prefixes, JWT tokens with service roles, database connection URIs, high-entropy strings, and variable assignments where a name like `key`, `secret`, `token`, or `password` is set to a literal string instead of `process.env.X` or equivalent.

**What counts as a finding:**

- **Modern AI & Cloud Provider Keys:**
  - OpenAI Project Keys (`sk-proj-...`, `sk-None-...`) — **Critical**
  - Anthropic Claude Keys (`sk-ant-api03-...`) — **Critical**
  - Groq (`gsk_...`), Perplexity (`pplx-...`), HuggingFace (`hf_...`) — **Critical**
  - Resend Email API Keys (`re_...`) — **Critical** (mass spam and phishing abuse)
  - Supabase `service_role` JWT (containing `"role":"service_role"`) — **Critical** (bypasses all Row-Level Security)
  - Hardcoded Database Connection URIs (`postgres://user:pass@host...`, `mongodb+srv://...`) — **Critical**
- A **live** Stripe secret key (`sk_live_...`) anywhere in source — **Critical**, charges real cards
- A **test** Stripe secret key (`sk_test_...`) committed in source — **Should Fix**, not production-critical but test keys still must not be committed; rotate if the repo has ever been shared
- A server-only credential referenced in frontend code, or a Next.js env var missing the required server-only scoping (using a secret key where only `NEXT_PUBLIC_`-prefixed vars should appear) — **Critical**, this is directly shippable to every visitor's browser

**What is NOT a finding (avoid false positives):**

- Public/anon/publishable keys that are designed to be exposed client-side (Stripe publishable keys starting `pk_`, Supabase anon keys, Firebase apiKey) — these are safe by design as long as server-side authorization is correctly configured. Note this distinction explicitly in the report.
- Example/placeholder values clearly meant as documentation, e.g. `"your-api-key-here"`
- Fake credentials inside unit tests, fixtures, or mock files (the scripts already skip these directories; if you find one manually, do not report it)

## Check 1b: Client-exposed secrets (frontend scope view)

This is the client-facing slice of Check 1a, used by the `frontend` scope. Focus on:

- Secrets reachable from the client bundle: any secret referenced in frontend code, anything passed through `NEXT_PUBLIC_*` / `VITE_*` / `REACT_APP_*` / `EXPO_PUBLIC_*` env vars that isn't genuinely public, and secrets inlined in client config files.
- **React Server Component (RSC) Prop Leaks:** In Next.js App Router, check if a Server Component imports a private secret and passes it as a prop to a client component (`<ClientComponent apiKey={process.env.PRIVATE_KEY} />`). Next.js serializes all props into the client HTML payload — **Critical**.
- Service-role keys (Supabase `service_role`, Firebase admin SDK private keys, OpenAI/Anthropic/Stripe secret keys) appearing anywhere under `src/`, `app/`, `components/`, `public/`, or client entry points — **Critical**.

The severity rules and false-positive guidance from Check 1a apply unchanged.

## Check 2: .gitignore and .dockerignore hygiene

**Run the script** `scripts/check_gitignore.py` (located relative to this `SKILL.md` file) against the project root.

**What counts as a finding:**

- `.env`, `.env.local`, `.env.production` present in the working directory and not listed in `.gitignore` — **Critical**, regardless of current contents
- **Docker Risk:** A `Dockerfile` or `docker-compose.yml` exists, but `.env` is omitted from `.dockerignore` — **Critical** (causes secret environment files to be baked into public image layers on Docker Hub/GHCR)
- **NPM Auth Tokens:** An `.npmrc` file containing `_authToken=` committed to git — **Critical**
- `.env` already committed to git history (check with `git log --all --full-history -- .env` if git is available) — **Critical**, and note in the fix that removing it from `.gitignore` going forward is not enough; the secrets in git history must be rotated, since they're recoverable even after deletion

## Check 3: Missing or fake authentication

**Run the script** `scripts/check_auth_patterns.py` (located relative to this `SKILL.md` file) against the project root as a first pass. Then search auth-related code (login handlers, middleware, route guards, session checks) for these patterns:

**What counts as a finding:**

- **Always-true stubs:** `function isAuthenticated(req) { return true; }`, `const checkAdmin = () => true` — **Critical**
- **Hardcoded mock user objects returned:**
  ```js
  function getCurrentUser() {
    return { id: "mock-id", role: "admin" }; // Placeholder forgot to replace!
  }
  ```
  Or middleware unconditionally setting `req.user = { id: 123 }` and calling `next()` — **Critical**
- **Stub-named helpers still wired in:** `mockAuth`, `fakeLogin`, `tempAuth`, `bypassAuth`, `devAuth` still present in a codebase with no clear dev-only guard around it. If properly guarded (e.g. `if (process.env.NODE_ENV === 'development')`), verify the guard is airtight and note it as **Should Fix**.
- **Provider-specific security gaps:**
  - **Clerk:** Check `middleware.ts` matcher regexes. If API routes or sensitive subpaths are excluded from the matcher, or if Clerk v5 `auth.protect()` is omitted from API routes — **Critical**.
  - **NextAuth / Auth.js:** Missing `AUTH_SECRET` / `NEXTAUTH_SECRET` in production configuration; exposing sensitive user properties or database credentials inside client session callbacks — **Should Fix**.
  - **Supabase Auth:** Using `supabase.auth.getSession()` on the server (Server Components, API routes, Server Actions) instead of `supabase.auth.getUser()`. `getSession()` reads local cookies without re-validating the token with the Supabase Auth server — **Critical**.
  - **Firebase Auth:** Client `auth.currentUser` trusted on server routes without server-side `admin.auth().verifyIdToken()`.
- **Protected routes with no auth check at all:** Compare route definitions against which ones return or modify user-specific data.
- **Client-side-only auth checks:** Hiding a button in the UI if not logged in, but the underlying API endpoint doesn't independently verify the session — **Critical**.
- **Cookie & Token Storage Security:** Auth tokens stored in browser `localStorage` (vulnerable to XSS token theft) rather than `httpOnly`, `Secure`, `SameSite=Lax/Strict` cookies — **Should Fix**.
- **Password hashing in custom auth:** Storing passwords in plaintext, or using outdated hash algorithms (MD5, SHA-1, plain SHA-256 without salt/work factor) instead of bcrypt or argon2 — **Critical**.

## Check 4: Database and backend-as-a-service misconfiguration

**Run the script** `scripts/check_db_config.py` (located relative to this `SKILL.md` file) against the project root as a first pass.

Distinguish between two architecture models:

### Branch A: Client-Exposed BaaS (Supabase, Firebase, Convex)
In these stacks, the browser connects directly to the database using an anonymous public API key. Security MUST be enforced at the database row/collection level:

- **Supabase:** Check for row-level security (RLS) policies on every table holding user-specific data. A table with RLS disabled, or enabled with a policy like `USING (true)` for `SELECT`/`UPDATE`/`DELETE` — **Critical**.
  ```sql
  -- Correct pattern:
  CREATE POLICY "users see own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);
  ```
- **Firebase:** Check `firestore.rules` or `storage.rules` for default-allow states (`allow read, write: if true;`) on user data collections — **Critical**. Test-mode expiration rules (`if request.time < timestamp...`) — **Should Fix**. Check `database.rules.json` for `".read": "true"` — **Critical**.
- **Convex:** Ensure functions returning private data are defined as `internalQuery` or validate `ctx.auth.getUserIdentity()`.

### Branch B: Server-Backed Databases & ORMs (Neon, AWS RDS, Prisma, Drizzle, Local DBs, Mongo)
In these stacks, client browsers never talk to the database directly; all queries flow through a backend server (Express, FastAPI, Next.js server):

- **Do NOT flag missing RLS on server-only tables:** Standard SQL migrations generated by Prisma or Drizzle do not require Postgres RLS if queries are filtered in backend application code.
- **Neon & Serverless Pooling:** Verify that serverless functions connect via connection pooling (e.g. `@neondatabase/serverless` or PgBouncer pooled connection strings). Direct unpooled Postgres connections in serverless routes cause connection exhaustion and crashes → **Should Fix**.
- **SSL / Transport Security:** Database connection URIs or pool configs with `sslmode=disable` or `rejectUnauthorized: false` transmit credentials and data in cleartext → **Critical** in production.
- **SQLite / Embedded DBs:** SQLite databases (`*.db`, `*.sqlite`, `*.sqlite3`) placed in web-accessible public folders (`public/`, `static/`) or committed to git allow arbitrary database download by any visitor → **Critical**.
- **MongoDB / NoSQL Injection:** Passing unescaped `req.body` or `req.query` directly into Mongoose/MongoDB query filters (e.g., `User.findOne(req.body)`) allows query selector injection (`{ "$gt": "" }` bypassing passwords) → **Critical**.

**Storage buckets:** Check whether file storage (Supabase Storage, Firebase Storage, S3) is set to public when it holds private user content (identification documents, invoices, private receipts) — **Critical**.

## Check 5: Broken object-level authorization (IDOR / BOLA)

This is the single most common serious flaw in vibe-coded apps. Check every route, Next.js Server Action, or RPC procedure that takes an ID and touches a database record:

```js
// Finding example — Critical
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const order = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  res.json(order); // any logged-in user can read ANY order by guessing/incrementing the id
});

// Correct pattern to recommend as the fix
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const order = await db.query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});
```

### Advanced IDOR Patterns:
- **Multi-Tenant / Organization IDOR:** In B2B or team apps, verifying `organization_id = req.params.orgId` is NOT enough. You must verify that the requesting `req.user.id` is an active member/admin of `orgId` before executing the query — **Critical**.
- **Next.js Server Actions:** Functions marked `'use server'` (`export async function deleteDocument(docId)`) are public RPC endpoints. If user authentication and document ownership are not verified inside the function body, anyone can invoke the action remotely — **Critical**.
- **tRPC / GraphQL Resolvers:** Check that resolvers pulling resources by ID verify authorization in context rather than returning records purely by input ID.
- Check GET (data exposure), PUT/PATCH (unauthorized modification), and DELETE (unauthorized deletion) across all endpoints.

## Check 6: Unvalidated inputs & server input handling

Spot-check forms, API endpoints, and server functions for:

- **Server-Side Request Forgery (SSRF):** Endpoints that fetch user-supplied URLs (link scrapers, webhooks, image proxies via `axios.get(req.body.url)` or `fetch()`). If URLs are not validated against private IP ranges (`127.0.0.1`, `localhost`, `169.254.169.254` AWS metadata, internal RFC1918 subnets), attackers can exfiltrate cloud credentials or hit internal services — **Critical**.
- **DOM XSS in AI Markdown Rendering:** Rendering LLM responses or user input using `dangerouslySetInnerHTML`, `v-html`, or markdown renderers (`react-markdown`, `marked`) without sanitization plugins (`rehype-sanitize` or DOMPurify) — **Critical**.
- **SQL built by string concatenation** instead of parameterized queries or ORM methods — **Critical**.
- **NoSQL / MongoDB injection:** Passing request objects straight to DB queries — **Critical**.
- **Mass assignment:** Request bodies spread directly into ORM create/update calls (`prisma.user.update({ where: { id }, data: req.body })`) — lets a user set privileged fields (`role`, `plan`, `isAdmin`, `emailVerified`) — **Critical** if a privileged field can be set, otherwise **Should Fix**.
- **CORS Misconfiguration:** Wildcard CORS reflection with credentials (`cors({ origin: '*', credentials: true })`) — **Critical**.
- **No rate limiting on auth endpoints:** Login, signup, password reset, and OTP endpoints with no throttle/attempt limit — **Should Fix** for payment-handling apps, **Worth Reviewing** otherwise.
- **File uploads with no restriction on file type or size.**

## Check 7: Client-side payment logic, webhooks, & subscription lifecycle

**Run the script** `scripts/check_payment_config.py` (located relative to this `SKILL.md` file) against the project root as a first pass.

### Step 1: Client-Side Price Trust
Search checkout flows for the price, discount, or total being read from data the client controls (`req.body.price`, `req.body.amount`, hidden form field) rather than looked up server-side from a trusted database record:

```js
// Finding example — Critical
app.post('/api/checkout', async (req, res) => {
  const { productId, price } = req.body; // price is trusted from the client!
  await chargeCard(req.user.paymentMethod, price);
});

// Correct fix pattern
app.post('/api/checkout', async (req, res) => {
  const { productId } = req.body;
  const product = await db.query('SELECT price FROM products WHERE id = $1', [productId]);
  await chargeCard(req.user.paymentMethod, product.price);
});
```

### Step 2: Webhook Signature Verification across Gateways
Every webhook endpoint (**Stripe**, **Lemon Squeezy**, **Dodo Payments**, **Polar**, **Paddle**, **Razorpay**, **PayPal**) must verify the cryptographic signature before trusting the event payload:
- **Stripe:** `stripe.webhooks.constructEvent(rawBody, sigHeader, secret)` with raw body parsing.
- **Lemon Squeezy:** Verify `x-signature` header via HMAC SHA-256.
- **Dodo Payments:** Verify webhook signature header via Dodo SDK or HMAC.
- **Paddle:** `paddle.webhooks.unmarshal` or HMAC check.
- **Razorpay:** `validateWebhookSignature` or HMAC SHA-256 check.
- An unverified webhook route — **Critical** (anyone can POST fake successful payments).

### Step 3: Webhook Idempotency
Payment gateways retry webhooks when endpoints time out. If the handler does not record and check processed event IDs (`event.id`) in the database, retries will grant duplicate credits or fulfill duplicate orders — **Should Fix**.

### Step 4: Subscription Revocation Lifecycle
AI apps frequently listen for `checkout.session.completed` to grant access, but omit handling for `customer.subscription.deleted`, `customer.subscription.updated`, `subscription_cancelled`, or `invoice.payment_failed`. If omitted, users retain paid access indefinitely after canceling — **Critical**.

### Step 5: Billing Portal IDOR
Creating customer billing portal sessions (`billingPortal.sessions.create`) with `customerId` taken from `req.body` rather than from the authenticated session user's database record allows callers to manage or cancel other customers' subscriptions — **Critical**.

---

## Severity rubric

- **Critical** — exploitable right now by any user or visitor, exposes real user data, or allows bypassing authentication or payment. Ship-blocking.
- **Should Fix** — a genuine weakness that requires more specific conditions to exploit (e.g. requires knowing another user's exact ID, or only affects an admin-only route with a smaller blast radius), or a control that exists but is incomplete/inconsistent.
- **Worth Reviewing** — best-practice gap with low immediate exploitability given the current app, but worth fixing before the app scales or handles more sensitive data.

When in doubt between two levels, consider: could a stranger with no special access do real harm to a real user right now? If yes, Critical.

## Report format

For every finding, use exactly this structure:

- Include a short `Confidence:` line when the evidence is not fully conclusive.
- Include a `Generated fix:` line when a direct code snippet or precise implementation step would help the agent patch the issue immediately.

**[SEVERITY] Short title**

- **What's wrong:** plain-English description, no jargon. If a technical term is unavoidable (e.g. "IDOR"), define it in one clause the first time it's used.
- **Why it matters:** a concrete, real-world consequence a non-technical person would understand — not "this violates the principle of least privilege" but "a stranger could see another user's home address and order history just by changing a number in the browser's address bar."
- **The fix:** a specific code snippet or precise instruction, not a vague suggestion like "add proper validation."
- **File(s):** exact path and line number(s).

## After the checks

Once the checks are complete, create a readiness review report. **The report must be written in clear, plain English, completely free of dense technical jargon, so that it is easily understandable by non-technical stakeholders (such as founders, clients, or project managers).** The report must include:

- what was found
- what is fixed already
- how each fix was applied
- what still needs attention
- the final readiness verdict

**Post-fix verification:** if you applied fixes during this session, re-run the scripts for every category you touched and confirm the finding is actually gone before marking it fixed in the report. Report before/after per check (e.g. "scan_secrets.py: 3 findings → 0 findings"). A fix that hasn't been re-scanned must be listed as "applied, not yet verified", never as resolved.

If no issues are found, still produce a short report that says no blocking issues were found in this pass, which categories were checked, and what the remaining scope limits are.

## Example report style

Use clear, direct wording like:

**[Critical] Missing object-level authorization**

- **What's wrong:** Any logged-in user can read another user's order by changing the order ID.
- **Why it matters:** A stranger could see someone else's orders and personal details.
- **The fix:** Add a user ownership check in the query and return 404 when the record does not belong to the current user.
- **File(s):** `src/routes/orders.ts:42-58`

## Final summary

End every review with, in this order:

1. Stack and data-sensitivity context noted at the start (one line)
2. Total findings by severity, e.g. "2 Critical, 3 Should Fix, 1 Worth Reviewing"
3. A one-line verdict: "Not ready to ship — fix the Critical items first" or "No blocking issues found in this pass — review the Should Fix items when you can"
4. The scope reminder:
   - **For Full Audit:** "This review covers common configuration patterns seen in AI-generated code — exposed secrets, auth stubs, database rules, object-level authorization, input validation, and client-side payment logic. It is not a comprehensive third-party safety audit or pentest. If this app handles payment, health, or other regulated data, get a professional external review before launch regardless of these results."
   - **For Scoped Scan:** "This was a focused [SCOPE]-only check ([LIST OF RUN CHECKS]). Skipped checks: [LIST OF SKIPPED CHECKS]. A clean scoped check does not mean the application is production-ready. Always run a full `/checkmyvibe` audit prior to release, and obtain a professional external security review if handling sensitive or regulated data."

## Notes for the agent

- Always produce a review report after the check; do not stop at raw findings.
- Write the entire report in clear, accessible language. Frame findings around concrete, real-world user consequences rather than abstract technical concepts. A non-technical stakeholder must be able to read the report and immediately understand the real-world danger.
- The review should clearly separate what was found, what was fixed, how it was fixed, and what remains.
- Always run the available scripts (located in the `scripts/` directory relative to this `SKILL.md` file) before relying on reasoning alone for Checks 1-4 and Check 7 — they exist so those specific checks are reliable and repeatable rather than dependent on re-deriving the logic every time.
- Scripts are Python 3: `scan_secrets.py`, `check_gitignore.py`, `check_auth_patterns.py`, `check_db_config.py`, and `check_payment_config.py`. Run them as `python <script> <target>` first; if `python` is not found (common on Linux/macOS), retry with `python3`. Note in the report which interpreter was used.
- If a script is missing, fails to run, or the language/stack isn't supported by it, say so explicitly in the report ("automated secret scan could not run; manually reviewed instead") rather than silently skipping the check.
- Do not invent findings to seem thorough. If a check finds nothing, report "No issues found" for that category explicitly — silence looks like the check wasn't performed at all.
- Do not flag the same underlying issue multiple times under different check categories — pick the most relevant category and reference it once.
- If the codebase is large, prioritize routes and files that touch authentication, payments, and any endpoint returning data tied to a specific user ID — these are where real damage concentrates.
