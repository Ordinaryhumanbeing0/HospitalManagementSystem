# /checkmyvibe-backend — Server-side audit

First, locate the checkmyvibe skill file `SKILL.md`. Check these paths in order:

1. `.claude/skills/checkmyvibe/SKILL.md` (project-level install)
2. `~/.claude/skills/checkmyvibe/SKILL.md` (global install)
3. If neither exists, search the working directory for a file named `SKILL.md` whose frontmatter contains `name: checkmyvibe`

Use SKILL.md **only** for the report format, severity rubric, and final-summary structure. The complete operating instructions for this scope are below — follow them even if SKILL.md cannot be found.

**Optional argument:** a target directory may be passed after the command. Default to the project root if not given. Scripts live in the `scripts/` folder next to SKILL.md.

## Scope

This is a **backend-only check**: Check 1a (server-side secrets) + Check 3 (auth) + Check 4 (db) + Check 5 (IDOR) + Check 6 server-side + Check 7 server-side. Skipped and to be listed as such in the summary: Check 1b (client-exposed secrets), Check 2 (.gitignore hygiene), and client-side views of checks 3/6/7.

## Step 1 — Run all four scripts

```bash
python <skill_dir>/scripts/scan_secrets.py <target>
python <skill_dir>/scripts/check_auth_patterns.py <target>
python <skill_dir>/scripts/check_db_config.py <target>
python <skill_dir>/scripts/check_payment_config.py <target>
```

Triage findings per the rules in `/checkmyvibe-secrets`, `/checkmyvibe-auth`, `/checkmyvibe-db`, and `/checkmyvibe-payment` respectively. If Python is unavailable, do each check manually and say so in the report.

## Step 2 — IDOR / BOLA sweep (Check 5 — spend the most time here)

This is the single most common serious flaw in AI-generated apps. Enumerate every route, Next.js Server Action, or RPC procedure that takes an ID and touches a database record:

```js
// Finding example — Critical: any logged-in user reads ANY order
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const order = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  res.json(order);
});

// Correct fix pattern: scope by owner, return 404 when absent
const order = await db.query(
  'SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
if (!order) return res.status(404).json({ error: 'Not found' });
```

### Advanced IDOR Patterns to Check:
- **Multi-Tenant / Organization IDOR:** In B2B or team workspaces, verifying `organization_id = req.params.orgId` is NOT enough. You must verify that the requesting `req.user.id` is an active member/admin of `orgId` before executing the query → **Critical**.
- **Next.js Server Actions:** Functions marked `'use server'` (`export async function deleteDocument(docId)`) are public RPC endpoints. If user authentication and document ownership are not verified inside the function body, anyone can invoke the action remotely → **Critical**.
- **tRPC / GraphQL Resolvers:** Check that resolvers pulling resources by ID verify authorization in context rather than returning records purely by input ID.
- Check GET (exposure), PUT/PATCH (modification), and DELETE (often most damaging) across all endpoints.

## Step 3 — Server-side input handling & validation (Check 6)

- **SQL built by string concatenation** instead of parameterized queries or ORM methods → **Critical**.
- **NoSQL / MongoDB Injection:** Passing `req.body` or `req.query` directly into `find()`, `findOne()`, or `deleteMany()` without sanitization → **Critical** (`{ "$gt": "" }` bypasses checks).
- **Server-Side Request Forgery (SSRF):** Endpoints that fetch user-supplied URLs (link scrapers, webhooks, image proxies via `axios.get(req.body.url)` or `fetch()`). If URLs are not validated against private IP ranges (`127.0.0.1`, `localhost`, `169.254.169.254` AWS metadata, internal RFC1918 subnets), attackers can exfiltrate cloud credentials or hit internal services → **Critical**.
- **Mass assignment:** `req.body` spread straight into ORM create/update (`prisma.user.update({ data: req.body })`, `User.findByIdAndUpdate(id, req.body)`) letting users set `role`, `plan`, `isAdmin`, `emailVerified` → **Critical**; non-privileged fields → **Should Fix**.
- **CORS Misconfiguration:** Wildcard CORS reflection with credentials (`cors({ origin: '*', credentials: true })`) → **Critical**.
- **Rate limiting on auth endpoints:** Login, signup, password reset, and OTP endpoints with no attempt throttle allow credential stuffing and SMS toll fraud → **Should Fix**.
- **Unrestricted File Uploads:** Upload endpoints with no validation of MIME type or file size.

## Step 4 — Payment processing & webhooks (Check 7, server side)

- Price/discount/total taken from request body, query param, or hidden field instead of looked up from the DB → **Critical**.
- **Webhook signature verification:** Every payment webhook route (**Stripe**, **Lemon Squeezy**, **Dodo Payments**, **Polar**, **Paddle**, **Razorpay**, **PayPal**) must verify cryptographic signatures before trusting the body. An unverified webhook route → **Critical** (anyone can POST fake successful payments).
- **Webhook Idempotency:** Missing event deduplication on gateway `event.id` causing duplicate credits on retried webhooks → **Should Fix**.
- **Subscription Revocation:** Missing handling for subscription cancellation/expiration events (`customer.subscription.deleted`, `subscription_cancelled`) → **Critical**.
- **Customer Portal IDOR:** Creating customer billing sessions using `req.body.customerId` instead of the session user's record → **Critical**.

## Report

Use the format, severity rubric, evidence/confidence rules, and post-fix verification step from SKILL.md. Fix priority when multiple issues exist: critical user exposure > auth bypass > IDOR > payment logic > config > hygiene. Scope reminder: "backend-only check — client-exposed secrets, .gitignore hygiene, and frontend-side views were skipped. This does not mean the app is production-ready. Run a full `/checkmyvibe` audit before launch."
