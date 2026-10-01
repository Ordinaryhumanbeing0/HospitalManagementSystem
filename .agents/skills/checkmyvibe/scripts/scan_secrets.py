#!/usr/bin/env python3
import os
import sys
import re
import math
import fnmatch

# Ensure stdout supports UTF-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Directories to skip during scanning
SKIP_DIRS = {
    'node_modules', '.git', 'build', 'dist', '.next', '.svelte-kit', 
    '__pycache__', 'venv', '.venv', 'env', 'coverage', 'out', '.expo',
    '.output', '.nuxt',
    # Test/support directories: mocked credentials here are expected, not leaks
    '__tests__', '__mocks__', '__snapshots__', 'tests', 'test', 'spec',
    'fixtures', 'mocks', 'e2e', 'cypress', '.storybook'
}

TEST_FILE_PATTERNS = ['*.test.*', '*.spec.*', '*.stories.*', '*.mock.*']

def is_test_file(filename):
    """Skip unit-test/spec/story/mock files: fake keys there are intentional."""
    return any(fnmatch.fnmatch(filename, pat) for pat in TEST_FILE_PATTERNS)

# File extensions to skip (binary/media/lockfiles/assets)
SKIP_EXTS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', 
    '.gz', '.mp3', '.mp4', '.mov', '.db', '.sqlite', '.exe', '.dll',
    '.so', '.dylib', '.woff', '.woff2', '.ttf', '.eot', '.lock',
    '.package-lock.json', '.pnpm-lock.yaml', '.yarn.lock', '.map',
    '.svg', '.css', '.scss', '.less', '.html', '.xml'
}

import base64
import json

# Regexes for known API key formats (live keys are Critical; test keys are Should Fix)
API_KEY_PATTERNS = [
    (re.compile(r'AIza[0-9A-Za-z-_]{35}'), 'Google API Key'),
    (re.compile(r'AKIA[0-9A-Z]{16}'), 'AWS Access Key ID'),
    (re.compile(r'ghp_[a-zA-Z0-9]{36,40}'), 'GitHub Personal Access Token'),
    (re.compile(r'github_pat_[0-9a-zA-Z_]{82}'), 'GitHub Fine-Grained Personal Access Token (Critical)'),
    (re.compile(r'sk_live_[0-9a-zA-Z]{24,96}'), 'Stripe LIVE Secret Key (Critical: charges real cards)'),
    (re.compile(r'sk_test_[0-9a-zA-Z]{24,96}'), 'Stripe TEST Secret Key (Should Fix: not production-critical but must not be committed)'),
    (re.compile(r'whsec_[0-9a-zA-Z]{32,64}'), 'Stripe Webhook Secret (Critical: allows forging payment events)'),
    (re.compile(r'xox[bapr]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32}'), 'Slack Token'),
    # Modern AI and Developer Providers
    (re.compile(r'sk-(?:proj|None)-[a-zA-Z0-9_-]{48,160}'), 'OpenAI Secret API Key (Critical: charges API usage)'),
    (re.compile(r'sk-ant-api03-[a-zA-Z0-9_-]{80,120}'), 'Anthropic Claude API Key (Critical: charges API usage)'),
    (re.compile(r'gsk_[a-zA-Z0-9]{52}'), 'Groq API Key'),
    (re.compile(r're_[a-zA-Z0-9]{32,48}'), 'Resend Email API Key (Critical: email sending/spam abuse)'),
    (re.compile(r'SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}'), 'SendGrid API Key (Critical: email sending/spam abuse)'),
    (re.compile(r'npm_[0-9a-zA-Z]{36}'), 'NPM Access Token (Critical: package publishing)'),
    (re.compile(r'phx_[a-zA-Z0-9]{40,64}'), 'PostHog Personal API Key (Critical)'),
    (re.compile(r'pplx-[a-zA-Z0-9]{48}'), 'Perplexity API Key'),
    (re.compile(r'hf_[a-zA-Z0-9]{34}'), 'HuggingFace Access Token'),
    (re.compile(r'(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[a-zA-Z0-9_.-]+:[^@\s]+@[a-zA-Z0-9_.-]+'), 'Hardcoded Database Connection URI with password (Critical)'),
]

JWT_PATTERN = re.compile(r'\beyJ[a-zA-Z0-9_-]+\.([a-zA-Z0-9_-]+)\.[a-zA-Z0-9_-]+\b')

def inspect_jwt_payload(token_payload_b64):
    """Inspect base64 JWT payload for sensitive roles like Supabase service_role."""
    try:
        padded = token_payload_b64 + '=' * (-len(token_payload_b64) % 4)
        payload_bytes = base64.urlsafe_b64decode(padded.encode('utf-8'))
        payload = json.loads(payload_bytes.decode('utf-8', errors='ignore'))
        if payload.get('role') == 'service_role':
            return 'Supabase Service Role JWT (Critical: bypasses all Row Level Security)'
    except Exception:
        pass
    return None

# Regex for variable assignments with potential hardcoded secrets
# Matches: name = "string" or "name": "string", where name contains key, secret, token, password, credential, auth
ASSIGNMENT_PATTERN = re.compile(
    r'(?i)(?:[\'"`]?)\b(\w*(?:key|secret|token|password|credential|auth)\w*)\b(?:[\'"`]?)\s*(?:=|:)\s*([\'"`])([^\'"`\n\r]{8,256})\2'
)

# Regex for standalone high-entropy candidate words (length 32 to 128)
HIGH_ENTROPY_WORD_PATTERN = re.compile(r'\b([a-zA-Z0-9+/=_-]{32,128})\b')

def calculate_entropy(s):
    """Calculate the Shannon entropy of a string."""
    if not s:
        return 0
    entropy = 0
    for x in set(s):
        p_x = s.count(x) / len(s)
        entropy -= p_x * math.log2(p_x)
    return entropy

def is_binary(file_path):
    """Check if a file is binary by looking for null bytes."""
    try:
        with open(file_path, 'rb') as f:
            chunk = f.read(1024)
            return b'\x00' in chunk
    except Exception:
        return True

def scan_file(file_path):
    findings = []
    if is_binary(file_path):
        return findings

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                # 1. Check known API key patterns
                for pattern, name in API_KEY_PATTERNS:
                    if pattern.search(line):
                        findings.append((line_num, f"Exposed {name}"))
                        
                # Check for JWT tokens (e.g. Supabase service_role)
                for jwt_match in JWT_PATTERN.finditer(line):
                    jwt_desc = inspect_jwt_payload(jwt_match.group(1))
                    if jwt_desc:
                        findings.append((line_num, f"Exposed {jwt_desc}"))
                        
                # 2. Check variable assignments
                for match in ASSIGNMENT_PATTERN.finditer(line):
                    var_name, quote, val = match.groups()
                    
                    # Ignore environment variable references, string interpolation, or placeholders
                    if any(x in val for x in ['process.env', 'os.environ', 'os.getenv', 'ENV[', '${', '{{', '}}']):
                        continue
                    
                    # Ignore common placeholder value patterns
                    val_lower = val.lower()
                    placeholders = {
                        'true', 'false', 'null', 'undefined', 'placeholder', 'dummy', 
                        'your_key_here', 'your-key-here', 'your_secret_here', 'your-secret-here',
                        'test', 'mock', 'none', 'value', 'secret', 'password', 'key', 'token'
                    }
                    if val_lower in placeholders or all(c in '-_*' for c in val):
                        continue
                    
                    entropy = calculate_entropy(val)
                    if len(val) >= 12 and entropy > 3.0:
                        findings.append((line_num, f"Potential secret assigned to '{var_name}' (entropy: {entropy:.2f})"))
                    elif len(val) >= 16:
                        findings.append((line_num, f"Suspicious long literal assigned to '{var_name}'"))

                # 3. Check for standalone high-entropy words (only if not already matched above)
                # Keep threshold high to reduce noise from base64 assets/hashes
                for match in HIGH_ENTROPY_WORD_PATTERN.finditer(line):
                    word = match.group(1)
                    # Skip if it is part of a URL, or has common non-secret structures
                    if any(x in line for x in ['http://', 'https://', 'src=', 'href=', 'url(']):
                        continue
                    
                    # Skip common long words/hashes that are not secrets (e.g. standard CSS classes, hex colors)
                    if re.match(r'^[0-9a-fA-F]+$', word) and len(word) < 40:
                        # Small hex hashes are common (commit IDs, etc.) - require higher length or entropy
                        continue
                        
                    entropy = calculate_entropy(word)
                    # True high entropy strings (like keys) typically have entropy > 4.2 for 32+ char length
                    if len(word) >= 32 and entropy > 4.3:
                        # Make sure it's not already reported in assignments
                        if not any(word in f[1] for f in findings):
                            findings.append((line_num, f"Standalone high-entropy string found (entropy: {entropy:.2f})"))
                            
    except Exception:
        pass
        
    return findings

def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    target_dir = os.path.abspath(target_dir)
    
    if not os.path.exists(target_dir):
        print(f"Error: Path '{target_dir}' does not exist.")
        sys.exit(1)
        
    for root, dirs, files in os.walk(target_dir):
        # Exclude directories in-place
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            # Skip hidden files unless they are .env configuration files
            if ext in SKIP_EXTS or is_test_file(file):
                continue
            if file.startswith('.') and not file.startswith('.env'):
                continue
                
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, target_dir)
            
            findings = scan_file(file_path)
            for line_num, desc in findings:
                print(f"{rel_path}:{line_num}: {desc}")

if __name__ == '__main__':
    main()
