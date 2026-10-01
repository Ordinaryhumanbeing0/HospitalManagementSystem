#!/usr/bin/env python3
import os
import sys
import re
import fnmatch

# Ensure stdout supports UTF-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SKIP_DIRS = {
    'node_modules', '.git', 'dist', 'build', '.next', '.svelte-kit',
    '__tests__', '__mocks__', 'tests', 'test', 'spec', 'fixtures',
    'mocks', 'e2e', 'cypress', 'venv', '.venv'
}

TEST_FILE_PATTERNS = ['*.test.*', '*.spec.*', '*.mock.*']

def is_test_file(filename):
    return any(fnmatch.fnmatch(filename, pat) for pat in TEST_FILE_PATTERNS)

# Patterns for client-controlled payment amounts
CLIENT_PRICE_PATTERNS = [
    (re.compile(r'(?i)\b(?:amount|price|unit_amount|total)\s*:\s*(?:req\.body|req\.query)\.(?:amount|price|unit_amount|total)\b'),
     "Charge amount or price is read directly from client request body/query (Critical: client price tampering)"),
    (re.compile(r'(?i)const\s*\{\s*[^}]*(?:price|amount|total)[^}]*\}\s*=\s*req\.body'),
     "Price or amount extracted directly from req.body (Critical: verify amount is fetched server-side from DB)"),
]

# Patterns detecting payment webhook routes
WEBHOOK_ROUTE_PATTERN = re.compile(
    r'(?i)\b(?:app|router)\s*\.\s*(?:post|all)\s*\(\s*[\'"`][^\'"`]*(?:webhook|stripe|lemonsqueezy|dodo|paddle|razorpay)[^\'"`]*[\'"`]'
)

# Provider signature verification patterns
STRIPE_SIG_PATTERN = re.compile(r'(?i)stripe\.webhooks\.constructEvent\s*\(')
LEMON_SIG_PATTERN = re.compile(r'(?i)(?:x-signature|crypto\.createHmac|createHmac\s*\(\s*[\'"]sha256[\'"])')
DODO_SIG_PATTERN = re.compile(r'(?i)(?:webhook-signature|dodo\.webhooks|verifyWebhookSignature)')
PADDLE_SIG_PATTERN = re.compile(r'(?i)(?:paddle\.webhooks|validateWebhookSignature|crypto\.createHmac)')
RAZORPAY_SIG_PATTERN = re.compile(r'(?i)(?:validateWebhookSignature|verifyPaymentSignature|crypto\.createHmac)')

# Subscription cancellation lifecycle patterns
SUB_CANCEL_PATTERNS = re.compile(
    r'(?i)(?:customer\.subscription\.deleted|subscription_cancelled|subscription\.canceled|subscription\.expired|invoice\.payment_failed)'
)

# Billing portal IDOR
PORTAL_IDOR_PATTERN = re.compile(
    r'(?i)\bbillingPortal\.sessions\.create\s*\(\s*\{[^}]*customer\s*:\s*req\.body\b'
)

def scan_file(file_path):
    findings = []
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            lines = content.splitlines()

        # 1. Line by line pattern matching
        for line_num, line in enumerate(lines, 1):
            for pattern, desc in CLIENT_PRICE_PATTERNS:
                if pattern.search(line):
                    findings.append((line_num, desc))

            if PORTAL_IDOR_PATTERN.search(line):
                findings.append((line_num, "Billing portal session created with customer ID from req.body (IDOR risk: user can manage another's subscription)"))

        # 2. Webhook verification checks across webhook handlers
        is_webhook_file = (
            any(kw in file_path.lower() for kw in ['webhook', 'stripe', 'lemonsqueezy', 'dodo', 'paddle', 'razorpay'])
            or WEBHOOK_ROUTE_PATTERN.search(content)
            or 'webhook' in content.lower()
        )
        
        if is_webhook_file:
            # Strip comments to prevent false negatives from keywords in comments
            content_no_comments = re.sub(r'//.*$', '', content, flags=re.M)
            content_no_comments = re.sub(r'/\*.*?\*/', '', content_no_comments, flags=re.S)
            content_no_comments = re.sub(r'#.*$', '', content_no_comments, flags=re.M)

            # Check Stripe webhook files
            if 'stripe' in content.lower() and ('event' in content.lower() or 'webhook' in content.lower()):
                if not STRIPE_SIG_PATTERN.search(content_no_comments) and ('checkout.session' in content or 'payment_intent' in content):
                    findings.append((1, "Stripe webhook handler detected without stripe.webhooks.constructEvent signature verification (Critical)"))

            # Check Lemon Squeezy webhooks
            if 'lemon' in content.lower() and ('signature' in content.lower() or 'event' in content.lower() or 'webhook' in content.lower()):
                if not LEMON_SIG_PATTERN.search(content_no_comments):
                    findings.append((1, "Lemon Squeezy webhook handler missing HMAC SHA-256 signature verification via x-signature header (Critical)"))

            # Check Dodo Payments webhooks
            if 'dodo' in content.lower() and ('webhook' in content.lower() or 'event' in content.lower()):
                if not DODO_SIG_PATTERN.search(content_no_comments):
                    findings.append((1, "Dodo Payments webhook handler missing signature verification (Critical)"))

            # Check Razorpay webhooks
            if 'razorpay' in content.lower() and ('webhook' in content.lower() or 'payment' in content.lower()):
                if not RAZORPAY_SIG_PATTERN.search(content_no_comments):
                    findings.append((1, "Razorpay payment/webhook handler missing signature verification check (Critical)"))

            # Check for subscription cancellation handling in subscription webhook files
            if ('subscription' in content.lower() or 'checkout.session.completed' in content.lower()) and ('user' in content.lower() or 'plan' in content.lower()):
                if not SUB_CANCEL_PATTERNS.search(content):
                    findings.append((1, "Subscription webhook handler handles setup/checkout but lacks subscription cancellation/failure handling (customer.subscription.deleted / subscription_cancelled) - allows revoked users to retain access"))

    except Exception:
        pass

    return findings

def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    target_dir = os.path.abspath(target_dir)

    findings_by_file = {}

    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]

        for file in files:
            if is_test_file(file):
                continue
            if file in ['check_payment_config.py', 'check_db_config.py', 'scan_secrets.py', 'check_auth_patterns.py', 'check_gitignore.py']:
                continue
            if not any(file.endswith(ext) for ext in ['.js', '.ts', '.jsx', '.tsx', '.py', '.php', '.go']):
                continue

            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, target_dir)

            file_findings = scan_file(file_path)
            if file_findings:
                findings_by_file[rel_path] = file_findings

    if not findings_by_file:
        print("PASS: No payment integrity or webhook security flaws detected.")
        sys.exit(0)

    print("FAIL: The following payment integrity issues were found:")
    for rel_path, file_findings in findings_by_file.items():
        for line_num, desc in file_findings:
            print(f"{rel_path}:{line_num}: {desc}")
    sys.exit(1)

if __name__ == '__main__':
    main()
