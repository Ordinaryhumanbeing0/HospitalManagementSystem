# /checkmyvibe-auth — Missing or fake authentication

First, locate the checkmyvibe skill file `SKILL.md`. Check these paths in order:

1. `.claude/skills/checkmyvibe/SKILL.md` (project-level install)
2. `~/.claude/skills/checkmyvibe/SKILL.md` (global install)
3. If neither exists, search the working directory for a file named `SKILL.md` whose frontmatter contains `name: checkmyvibe`

Use SKILL.md **only** for the report format, severity rubric, and final-summary structure. The complete operating instructions for this scope are below — follow them even if SKILL.md cannot be found.

**Optional argument:** a target directory may be passed after the command. Default to the project root if not given. Scripts live in the `scripts/` folder next to SKILL.md.

## Scope

This is an **authentication-only check** (Check 3). Checks 1a/1b, 2, 4, 5, 6, and 7 are skipped and must be listed as skipped in the final summary.

## Step 1 — Run the first-pass script

```bash
python <skill_dir>/scripts/check_auth_patterns.py <target>
```

It flags stub names (`mockAuth`, `fakeLogin`, `tempAuth`, `bypassAuth`), functions returning `true` unconditionally, mock user dictionary/object returns (`req.user = {...}`, `return { id: ... }`), middleware unconditionally calling `next()`, and insecure Supabase `getSession()` usage on server routes. The script skips test directories and documentation files.

## Step 2 — Manual reasoning pass (this is where the real findings are)

The script is a first pass only. Read the actual auth code across login handlers, middleware, route guards, session checks, and every route that returns or modifies user-specific data.

Findings to hunt for:

- **Always-true stubs & mock user objects:** `function isAuthenticated() { return true; }`, `req.user = { id: "demo", role: "admin" }`, middleware calling `next()` unconditionally with a TODO comment — **Critical**.
- **Stub-named helpers still wired in:** `mockAuth`, `devAuth`, `bypassAuth` reachable in production paths — **Critical**. Properly guarded behind `NODE_ENV === 'development'` → **Should Fix** (environment misconfigurations frequently expose these); verify the guard covers every call site.
- **Provider-specific security gotchas:**
  - **Clerk:** Check `middleware.ts` matcher regexes. If `/api/(.*)` is omitted from the protected matcher, or if Clerk v5 `auth.protect()` is omitted from sensitive API routes → **Critical**.
  - **NextAuth / Auth.js:** Missing `AUTH_SECRET` / `NEXTAUTH_SECRET` in production configuration; exposing sensitive user properties or database credentials inside client session callbacks → **Should Fix**.
  - **Supabase Auth:** Using `supabase.auth.getSession()` on the server (Server Components, API routes, Server Actions) instead of `supabase.auth.getUser()`. `getSession()` reads local cookies without re-validating the token with the Supabase Auth server → **Critical**.
  - **Firebase Auth:** Unverified `auth.currentUser` on the client trusted on server routes without server-side `admin.auth().verifyIdToken()`.
- **Protected routes with no auth check at all:** Compare routes that return or modify user-specific data against route definitions. Any route touching user records with no guard is **Critical**.
- **Client-side-only enforcement:** UI hides a button or redirects on the client (`{user.isAdmin && <AdminPanel />}`), but the underlying API endpoint lacks an authentication/role check — **Critical**. Anyone can call the API directly. You MUST inspect the server route.
- **Cookie & Token Storage Security:** Auth tokens stored in browser `localStorage` (vulnerable to XSS token theft) rather than `httpOnly`, `Secure`, `SameSite=Lax/Strict` cookies → **Should Fix**.
- **Password hashing in custom auth:** Storing passwords in plaintext, or using outdated hash algorithms (MD5, SHA-1, plain SHA-256 without salt/work factor) instead of bcrypt or argon2 → **Critical**.

## Step 3 — Judgment rules

- Read the function body fully before flagging or clearing — never decide from the name alone.
- Prefer one precise finding over several weak ones; tag uncertain items `High confidence` / `Medium confidence` / `Needs manual review`.
- Identify the stack's intended auth mechanism (Clerk, NextAuth, Supabase Auth, Firebase, custom JWT/session) first; "missing" means missing relative to how routes access user data, not absence of a specific library.

## Report

Use the format, severity rubric, and final-summary structure from SKILL.md. Scope reminder: "authentication-only check — secrets, .gitignore, database rules, IDOR, input validation, and payment checks were skipped. This does not mean the app is production-ready. Run a full `/checkmyvibe` audit before launch."
