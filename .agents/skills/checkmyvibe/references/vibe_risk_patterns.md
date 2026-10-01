# Vibe Readiness Risk Patterns

This document serves as an exhaustive reference for common readiness risk patterns identified in AI-generated ("vibe-coded") applications. AI coding assistants frequently introduce these configuration and design flaws because they prioritize speed, feature completion, and standalone component demonstration over robust production-ready setups.

---

## 1. Exposed Secrets

### Overview
AI assistants scaffold code with hardcoded API keys, JWT secrets, database connection strings, or third-party client keys directly inside configuration files or source code. Local environment files (`.env`) are frequently created without updating `.gitignore` or `.dockerignore`.

### Why it happens in AI-generated code
1. **Context-Window Convenience:** Models frequently inline secret strings (`const openai = new OpenAI({ apiKey: "sk-proj-..." })`) so code runs immediately without requiring manual `.env` file configuration by the user.
2. **Bundler Prefix Confusion:** AI models mix up server and client environments in Next.js/Vite, assigning server-only secrets to `NEXT_PUBLIC_*` or `VITE_*` variables.
3. **React Server Component (RSC) Prop Leaks:** In Next.js App Router, an AI generates a Server Component that imports an environment variable and passes it as a prop to a client component (`<ChatWidget apiKey={process.env.OPENAI_KEY} />`), serializing the private secret directly into the browser HTML.
4. **Docker Leaks:** Models create a `Dockerfile` with `COPY . .` but omit `.dockerignore`, baking local `.env` files into public container images.

### The Correct Fix
- Keep all secrets in server-side environment variables accessed strictly on the server: `process.env.OPENAI_API_KEY`.
- Ensure `.env*` is listed in both `.gitignore` and `.dockerignore`.
- Check git commit history (`git log --all --full-history -- .env`) and rotate any key that was ever committed.

---

## 2. Missing/Fake Authentication (Fake/Stubbed Auth)

### Overview
When generating authentication flows, AI tools often implement mock authentication functions, dummy user objects, or bypass middleware to make manual testing seamless during development. Developers unknowingly deploy this placeholder logic directly to production.

### Why it happens in AI-generated code
1. **Scaffolding Shortcuts:** AI assistants generate middleware like:
   ```js
   function authMiddleware(req, res, next) {
     req.user = { id: "test-user", role: "admin" }; // TODO: replace with real JWT auth
     next();
   }
   ```
2. **Provider Route Matcher Gaps:** When integrating modern auth providers like Clerk or NextAuth, AI tools often write overly permissive route matchers in Next.js `middleware.ts` (e.g., omitting `/api/(.*)`), leaving backend routes unprotected.
3. **Supabase Server Session Trap:** Models frequently call `supabase.auth.getSession()` on server routes or Server Actions. Supabase warns that `getSession()` is insecure on the server because it does not cryptographically revalidate the token with the Supabase Auth server.

### The Correct Fix
- Eliminate all mock auth stubs from production code paths.
- On Supabase servers, always use `await supabase.auth.getUser()`.
- For Clerk, protect all sensitive API routes with `auth.protect()`.
- Store authentication tokens in `httpOnly`, `Secure`, `SameSite` cookies rather than browser `localStorage`.

---

## 3. Database Misconfiguration (Permissive Database Rules / RLS)

### Overview
Databases directly exposed to the browser (Supabase, Firebase, Convex) rely on Row-Level Security (RLS) or security rules to restrict data access. AI assistants frequently scaffold projects with default allow-all rules (`USING (true)` / `allow read, write: if true;`) or create tables without enabling RLS.

### Why it happens in AI-generated code
1. **Quick-Fixing Permission Errors:** When an AI model encounters permission errors while building a frontend prototype, its default reaction is often to run `CREATE POLICY "allow_all" ON <table> FOR ALL USING (true);`.
2. **Server-Backed ORM Confusion:** When transitioning between Supabase and server-backed ORMs (Prisma, Drizzle, Neon, local SQLite/Postgres), models often fail to recognize whether the database is private behind a server or public to the browser.
3. **Exposed SQLite Files:** In lightweight stacks, models place `data.sqlite` directly inside the `public/` directory, allowing any web visitor to download the entire database via a simple HTTP GET request.
4. **NoSQL Query Injection:** In MongoDB/Mongoose backends, models pass `req.body` directly to `User.findOne(req.body)`, allowing query selectors like `{ "$gt": "" }` to bypass password checks.

### The Correct Fix
- In Supabase, enable RLS on every table and bind policies to `auth.uid() = user_id`.
- Never place SQLite or database files in public web directories.
- In serverless Postgres (Neon), configure connection pooling (`@neondatabase/serverless`) to prevent connection pool exhaustion.
- Sanitize Mongoose inputs using schema validation or explicit field extraction instead of passing raw request objects.

---

## 4. Broken Object-Level Authorization (BOLA / IDOR)

### Overview
BOLA/IDOR occurs when an endpoint retrieves, modifies, or deletes a resource based on a client-supplied identifier (e.g. `/api/orders/:id`, Server Actions `deleteDocument(id)`) without verifying that the authenticated user owns or has permission to access that resource.

### Why it happens in AI-generated code
1. **Single-Table Query Scaffolding:** AI tools generate queries using only the primary key:
   ```js
   const item = await db.query('SELECT * FROM items WHERE id = $1', [req.params.id]);
   ```
2. **Server Actions RPC Insecurity:** In Next.js App Router, models expose Server Actions (`'use server'`) without re-authenticating the session inside the action function body.
3. **Multi-Tenant Blindness:** In team/organization applications, models verify `WHERE organization_id = req.params.orgId` without checking whether the requesting user is actually a member of that organization.

### The Correct Fix
- Always scope database queries by both resource ID and the authenticated user/organization ID:
  ```js
  const order = await db.query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!order) return res.status(404).json({ error: 'Not found' });
  ```

---

## 5. Unvalidated Inputs, SSRF, & DOM XSS

### Overview
AI-generated code frequently trusts client inputs, leading to Server-Side Request Forgery (SSRF), DOM XSS in AI markdown renderers, SQL/NoSQL injection, and mass assignment.

### Why it happens in AI-generated code
1. **SSRF in AI Link/Image Scrapers:** AI apps frequently take a user-supplied URL to scrape or summarize (e.g. `axios.get(req.body.url)`). Attackers pass `http://169.254.169.254/latest/meta-data/` to steal cloud metadata and IAM credentials.
2. **DOM XSS via AI Markdown:** AI chat interfaces render model responses using `dangerouslySetInnerHTML` or `react-markdown` without `rehype-sanitize` or DOMPurify, enabling persistent XSS attacks via prompt injection.
3. **Mass Assignment:** Models write `await prisma.user.update({ where: { id }, data: req.body })`, allowing callers to overwrite privileged fields like `role: "admin"` or `isVerified: true`.

### The Correct Fix
- Filter user-supplied URLs against private IP ranges (`127.0.0.1`, `169.254.169.254`, `10.*.*.*`) before executing server-side HTTP requests.
- Sanitize rendered markdown using `rehype-sanitize` or DOMPurify.
- Whitelist request body fields explicitly when updating database records.

---

## 6. Client-Side Payment Logic & Webhook Risks

### Overview
AI assistants frequently write payment flows where prices are trusted from client payloads, webhook signatures are never verified, idempotency is ignored, and subscription cancellations are unhandled.

### Why it happens in AI-generated code
1. **Trusting Client Amounts:** When creating checkout sessions, models extract `price` from `req.body` (`const { price } = req.body; charge(price);`), allowing users to edit the price to $0.01 in browser dev tools.
2. **Omitted Webhook Signatures:** In Stripe, Lemon Squeezy, Dodo Payments, or Razorpay integrations, models read webhook events directly from `req.body` without verifying cryptographic signatures.
3. **Lack of Idempotency:** Gateways retry webhooks on timeouts. Without tracking `event.id` in the database, retried webhooks grant duplicate credits or double-ship orders.
4. **The Cancellation Trap:** Models implement `checkout.session.completed` to grant access, but completely forget to listen for `customer.subscription.deleted` or `subscription_cancelled`. Canceled users retain paid access indefinitely.

### The Correct Fix
- Always resolve prices server-side from your product catalog or database.
- Cryptographically verify webhook signatures using gateway SDKs or HMAC SHA-256 before acting on event payloads.
- Record processed webhook event IDs (`event.id`) to ensure idempotent execution.
- Implement subscription cancellation and payment failure listeners to revoke access when plans expire.
