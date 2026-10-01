# /checkmyvibe-payment — Payment & pricing integrity

First, locate the checkmyvibe skill file `SKILL.md`. Check these paths in order:

1. `.claude/skills/checkmyvibe/SKILL.md` (project-level install)
2. `~/.claude/skills/checkmyvibe/SKILL.md` (global install)
3. If neither exists, search the working directory for a file named `SKILL.md` whose frontmatter contains `name: checkmyvibe`

Use SKILL.md **only** for the report format, severity rubric, and final-summary structure. The complete operating instructions for this scope are below — follow them even if SKILL.md cannot be found.

**Optional argument:** a target directory may be passed after the command. Default to the project root if not given. Scripts live in the `scripts/` folder next to SKILL.md.

## Scope

This is a **payment/pricing-only check** (Check 7, both client and server views). Checks 1a/1b, 2, 3, 4, 5, and 6 are skipped and must be listed as skipped in the final summary. Note: if this app handles real payments, state in the report that a professional external review is strongly recommended regardless of findings.

## Step 1 — Run the first-pass script

```bash
python <skill_dir>/scripts/check_payment_config.py <target>
```

It scans source files for client-controlled amounts/prices in checkout endpoints, detects payment webhook routes, checks for provider signature verification (Stripe, Lemon Squeezy, Dodo Payments, Paddle, Razorpay), checks for missing subscription cancellation listeners, and detects billing portal IDOR risks.

If Python is unavailable or it fails, do the equivalent checks by reading payment handlers manually and say so in the report.

## Step 2 — Map the payment surface

Identify all payment and merchant-of-record providers in use:
- **Stripe** (`stripe`, `@stripe/stripe-js`)
- **Dodo Payments** (AI app monetization)
- **Lemon Squeezy** (`@lemonsqueezy/lemonsqueezy.js`)
- **Polar.sh** (`@polar-sh/sdk`)
- **Paddle** (`@paddle/paddle-node-sdk`)
- **Razorpay** (`razorpay`)
- **PayPal** (`@paypal/checkout-server-sdk`)

Locate checkout endpoints, webhook routes, cart/price calculation code, subscription tier handlers, and coupon/discount handling. If there is no payment code at all, report "No issues found — no payment flow exists" and stop.

## Step 3 — Server-side price trust

For each chargeable action:

- Is the amount read from the request (body field, query param, hidden form field) or computed from client-supplied data? → **Critical**:
  ```js
  // Finding example — Critical: client controls price
  const { productId, price } = req.body;
  await chargeCard(req.user.paymentMethod, price);

  // Correct fix pattern — server looks up the price
  const { productId } = req.body;
  const product = await db.query('SELECT price FROM products WHERE id = $1', [productId]);
  await chargeCard(req.user.paymentMethod, product.price);
  ```
- Quantities, currency, plan tiers, or seat counts accepted from the client and multiplied into totals without server-side validation → same severity.
- Coupons/discounts validated only on the client, or discount values sent by the client rather than looked up server-side → **Critical**.
- Free-trial/trial-flag booleans trusted from request bodies (`req.body.trial = true`) → **Critical** (anyone posts `trial: true` forever).

## Step 4 — Webhook signature verification across providers

Every payment webhook route must verify authenticity BEFORE trusting or acting on its body:

- **Stripe:** `stripe.webhooks.constructEvent(rawBody, sigHeader, process.env.STRIPE_WEBHOOK_SECRET)` with `express.raw({ type: 'application/json' })`.
- **Lemon Squeezy:** Verify `x-signature` header using `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')` (with timing-safe comparison).
- **Dodo Payments:** Verify webhook signature header via Dodo SDK or HMAC verification.
- **Paddle:** Verify signature with `paddle.webhooks.unmarshal` or HMAC check.
- **Razorpay:** `validateWebhookSignature` or `crypto.createHmac('sha256', secret)` comparison.
- **PayPal:** `verify-webhook-signature` API call.

No signature verification anywhere in the handler chain → **Critical**: anyone who finds the URL can POST a fake "payment succeeded" event and get orders or licenses marked paid for free.

## Step 5 — Webhook Idempotency & Replay Attack Prevention

Payment gateways retry webhooks if an endpoint takes >3s or returns 5xx:
- Check if webhook handlers record the processed gateway event ID (`event.id`) in the database before granting access or fulfilling orders.
- If missing, a retried webhook can cause duplicate credits, duplicate license generation, or double-shipping → **Should Fix**.

## Step 6 — Subscription Cancellation & Revocation Lifecycle

- AI apps often handle `checkout.session.completed` to grant access, but completely omit `customer.subscription.deleted`, `customer.subscription.updated`, `subscription_cancelled`, or `invoice.payment_failed`.
- If the revocation event is not handled, users who cancel their plan or whose credit cards expire retain paid access indefinitely → **Critical**.

## Step 7 — Billing Portal IDOR

- Inspect customer billing portal session creation (e.g. `stripe.billingPortal.sessions.create`):
- If `customerId` is taken from `req.body` rather than resolved from the authenticated user's session record in the database, users can manage, view invoices for, or cancel other customers' subscriptions → **Critical**.

## Report

Use the format, severity rubric, and final-summary structure from SKILL.md. Scope reminder: "payment-only check — secrets, .gitignore, authentication, database rules, IDOR, and input validation were skipped. This does not mean the app is production-ready. Run a full `/checkmyvibe` audit before launch, and get a professional security review before handling real money."
