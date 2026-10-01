# checkmyvibe

A structured, zero-dependency, local production readiness and code quality workflow packaged as an Agent Skill for AI coding assistants. Built for Claude Code today; the skill and command files can be adapted to other agents' rule/command formats.

AI-generated ("vibe-coded") applications built on modern AI tools frequently ship with serious, well-documented configuration and quality issues—such as exposed API keys, fake authentication stubs, permissive default database rules, and client-side pricing logic. **checkmyvibe** solves this by packaging readiness and verification checks directly into an Agent Skill. When you ask your coding agent to "run checkmyvibe" or "perform a readiness check", the agent uses checkmyvibe's local helper scripts and its own reasoning capabilities to analyze your codebase, producing a prioritized report detailing what configuration issues or gaps exist, why they matter, and how to fix them.

---

## What This Checks For

*   **Exposed Secrets & API Keys:** Identifies hardcoded API keys, JWT secrets, database connection strings, and high-entropy strings across your files (including modern AI providers like OpenAI `sk-proj-`, Anthropic `sk-ant-`, Groq, Resend, and Supabase `service_role` JWTs).
*   **Version Control & Container Leakage:** Verifies if sensitive files (like `.env`) exist in the project but are not properly excluded in your `.gitignore` or `.dockerignore` files (preventing secrets from baking into public Docker images).
*   **Fake & Stubbed Authentication:** Greps for mock authentication markers (such as functions named `mockAuth`, `fakeLogin`, `tempAuth`, dummy user object returns, middleware calling `next()` unconditionally, or Clerk/NextAuth/Supabase configuration gaps).
*   **Database Misconfigurations & Architecture:** Identifies permissive default rules in BaaS platforms (Supabase RLS, Firebase/Firestore rules), verifies connection pooling and SSL transport security in serverless databases (like Neon), inspects ORM schemas (Prisma/Drizzle), checks for exposed SQLite files in public web directories, and flags NoSQL/MongoDB injection risks.
*   **Broken Object-Level Authorization (BOLA/IDOR):** Analyzes API routes, Next.js Server Actions (`'use server'`), and tRPC procedures to check if endpoints fetch or mutate resources by ID without validating that the authenticated user owns or has permission to access that resource across user and multi-tenant organization boundaries.
*   **Server-Side Security & SSRF:** Audits URL/image fetching endpoints for Server-Side Request Forgery (SSRF) and checks for DOM XSS in unescaped AI markdown rendering.
*   **Payment, Webhook, & Subscription Integrity:** Scans checkout routes to check if prices are accepted directly from client-side parameters, verifies cryptographic signature validation across payment gateways (Stripe, Dodo Payments, Lemon Squeezy, Polar.sh, Paddle, Razorpay), checks for webhook idempotency (`event.id` deduplication), and verifies subscription cancellation lifecycle handling.

---

## What This Does NOT Check For (Disclaimer)

> [!WARNING]
> **checkmyvibe is not a substitute for a full professional external security audit.**
> This tool is a first-pass quality and readiness checklist meant to highlight common mistakes and temporary scaffolding shortcuts made by AI coding models during rapid prototyping. It does not perform dynamic runtime analysis, penetration testing, deep static analysis, dependency vulnerability checks, or comprehensive logic auditing. Do not rely solely on checkmyvibe to declare your application hardened for production.

---

## Installation

### Method 1: Using npx (Recommended)
You can install and copy the skill automatically to your project or global environment by running:

```bash
npx checkmyvibe
```

The installer will detect if you have a `.claude` configuration directory in your project root and offer to install it either locally (project-level) or globally for your user.

### Method 2: Manual Installation
If you prefer not to use `npx`, copy the files manually:

1. Create a `checkmyvibe` directory inside your agent's skills path:
   * **Project-level (Claude Code):** `.claude/skills/checkmyvibe/`
   * **Global/Personal (Claude Code):** `~/.claude/skills/checkmyvibe/`
2. Copy `SKILL.md`, the `scripts/` folder, `references/` folder, and `commands/` folder into that directory.
3. (Optional for slash command support) Copy the files from `commands/` directly into `.claude/commands/` (or `~/.claude/commands/`).

---

## Usage

### Full Production Readiness Audit
Run a complete audit across all categories before deploying or shipping:
* Command: `/checkmyvibe`
* Or prompt: *"Run checkmyvibe on this project"*

### Focused / Scoped Scanning
When actively developing a specific feature, run focused scans for fast, targeted feedback without running the entire test suite:

| Slash Command | Scope / Keyword | Included Checks | Use Case |
| :--- | :--- | :--- | :--- |
| `/checkmyvibe-secrets` | `/checkmyvibe secrets` | Checks 1a + 1b + 2 | Server-side and client-exposed API keys/credentials, plus `.gitignore` hygiene |
| `/checkmyvibe-auth` | `/checkmyvibe auth` | Check 3 | Missing, mock, stubbed, or bypassed authentication guards |
| `/checkmyvibe-db` | `/checkmyvibe db` | Check 4 | Database & BaaS rules, Supabase RLS policies, Firebase permissions |
| `/checkmyvibe-backend` | `/checkmyvibe backend` | Checks 1a, 3, 4, 5, 6 (server), 7 (server) | All server-side logic: hardcoded server credentials, auth, DB/RLS, IDOR/BOLA, SQLi/input validation/mass assignment, payment & webhook processing |
| `/checkmyvibe-frontend` | `/checkmyvibe frontend` | Checks 1b, 3 (client), 7 (client) | Client bundle key leaks, UI-only auth hiding, client-side pricing overrides |
| `/checkmyvibe-payment` | `/checkmyvibe payment` | Check 7 | Client-side payment tampering, price overrides, unverified webhooks, checkout integrity |

Each scoped command file contains its complete operating instructions inline — it only falls back to `SKILL.md` for the report format and severity rubric — so scoped scans work reliably even when skill auto-discovery fails.

The agent will walk through the scoped checks, execute relevant local helper scripts, and print a prioritized markdown report (Critical / Should Fix / Worth Reviewing) with concrete remediation steps.

---

## Other Agents & Harnesses

checkmyvibe's checks are plain markdown + Python scripts — any coding agent that can read files and run shell commands can run them. The `adapters/` folder ships thin discovery files so non-Claude-Code agents can find the skill:

| Harness | How it works |
| :--- | :--- |
| **Claude Code** | Native: skill auto-discovery + `/checkmyvibe` slash commands (installed by default) |
| **Codex CLI / Gemini CLI** | Paste the snippet from `adapters/AGENTS-SNIPPET.md` into your `AGENTS.md` (installer appends it automatically if one exists) |
| **Cursor** | Installer drops `adapters/checkmyvibe.mdc` into `.cursor/rules/` when a `.cursor/` directory exists; or copy it manually |
| **opencode** | Installer copies `adapters/opencode-checkmyvibe.md` to `.opencode/command/checkmyvibe.md`, giving you `/checkmyvibe <scope>` |

Adapters are intentionally thin — they only tell the agent where to find and how to read `SKILL.md`, which remains the single source of truth for all check logic. On Linux/macOS, the agent will automatically fall back to `python3` if `python` is not on PATH.

---

## License

This project is open-source and licensed under the [Apache 2.0 License](LICENSE).