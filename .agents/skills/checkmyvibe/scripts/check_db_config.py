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

# Permissive rules patterns for Firestore and Firebase Storage
FIREBASE_PERMISSIVE = re.compile(r'allow\s+[\w\s,]+:\s*if\s+true\s*;')

# Permissive Realtime Database rules
RTDB_PERMISSIVE = re.compile(r'"\.(read|write)"\s*:\s*"true"')

# Insecure DB connection configuration
INSECURE_DB_SSL = re.compile(r'(?i)(?:sslmode\s*=\s*disable|ssl\s*:\s*false|rejectUnauthorized\s*:\s*false)')

# NoSQL / MongoDB direct body injection
MONGO_INJECTION_PATTERN = re.compile(r'(?i)\b\w+\.(?:find|findOne|deleteMany|updateOne|updateMany)\s*\(\s*(?:req\.body|req\.query)\s*\)')

def scan_firebase_rules(file_path):
    """Scan Firestore/Storage rules for allow-all statements."""
    findings = []
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                clean_line = line.strip()
                if FIREBASE_PERMISSIVE.search(clean_line):
                    findings.append((line_num, f"Permissive allow-all rule found: `{clean_line}`"))
    except Exception:
        pass
    return findings

def scan_rtdb_rules(file_path):
    """Scan Firebase Realtime Database rules for true reads/writes."""
    findings = []
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                clean_line = line.strip()
                if RTDB_PERMISSIVE.search(clean_line):
                    findings.append((line_num, f"Permissive RTDB allow-all rule found: `{clean_line}`"))
    except Exception:
        pass
    return findings

def scan_sql_rls(file_path):
    """Scan SQL files to check if RLS is enabled on all tables and check for permissive policies."""
    findings = []
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        # 1. Strip comments
        content_no_comments = re.sub(r'--.*$', '', content, flags=re.M)
        content_no_comments = re.sub(r'/\*.*?\*/', '', content_no_comments, flags=re.S)

        # 2. Find all CREATE TABLE statements
        created_tables = re.findall(r'(?i)create\s+table\s+(?:if\s+not\s+exists\s+)?([\w\.]+)', content_no_comments)
        enabled_rls = re.findall(r'(?i)alter\s+table\s+(?:if\s+exists\s+)?([\w\.]+)\s+enable\s+row\s+level\s+security', content_no_comments)
        
        def clean_table_name(t):
            t = t.replace('"', '').replace("'", "")
            if '.' in t:
                t = t.split('.')[-1]
            return t.lower()
            
        created_clean = [clean_table_name(t) for t in created_tables]
        enabled_clean = [clean_table_name(t) for t in enabled_rls]
        
        for idx, table in enumerate(created_tables):
            clean_t = clean_table_name(table)
            if clean_t not in enabled_clean:
                escaped_t = re.escape(table)
                match = re.search(r'(?i)create\s+table\s+(?:if\s+not\s+exists\s+)?' + escaped_t, content)
                line_num = content.count('\n', 0, match.start()) + 1 if match else 1
                findings.append((line_num, f"Table '{table}' is created but Row Level Security (RLS) is not enabled"))
                
        # 3. Find permissive policies
        policy_pattern = re.compile(
            r'(?i)create\s+policy\s+("[^"]+"|[a-zA-Z_]\w*)\s+on\s+([\w\.]+)\s+[^;]+?(?:using|with\s+check)\s*\(\s*true\s*\)',
            re.DOTALL
        )
        
        for match in policy_pattern.finditer(content_no_comments):
            policy_name = match.group(1)
            table_name = match.group(2)
            orig_match = re.search(r'(?i)create\s+policy\s+' + re.escape(policy_name), content)
            line_num = content.count('\n', 0, orig_match.start()) + 1 if orig_match else 1
            findings.append((line_num, f"Permissive policy {policy_name} on table {table_name} allows public access via USING(true) / CHECK(true)"))
            
    except Exception:
        pass
    return findings

def detect_project_db_context(target_dir):
    """Detect if project uses client-facing BaaS (Supabase/Firebase) or server-only ORM (Prisma/Drizzle/Mongoose/Neon)."""
    has_supabase = False
    has_firebase = False
    has_server_orm = False
    
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
        if 'supabase' in root.lower() or any('supabase' in f.lower() for f in files):
            has_supabase = True
        if any(f in ['firestore.rules', 'firebase.json', 'database.rules.json'] for f in files):
            has_firebase = True
        if 'schema.prisma' in files or any(f.startswith('drizzle.config') for f in files):
            has_server_orm = True
            
    return {
        'has_supabase': has_supabase,
        'has_firebase': has_firebase,
        'has_server_orm': has_server_orm
    }

def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    target_dir = os.path.abspath(target_dir)
    
    findings_by_file = {}
    context = detect_project_db_context(target_dir)
    
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
        
        for file in files:
            if is_test_file(file):
                continue
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, target_dir)
            
            # 1. Check for exposed SQLite files in public web directories
            if any(file.lower().endswith(ext) for ext in ['.sqlite', '.sqlite3', '.db']):
                rel_lower = rel_path.lower().replace('\\', '/')
                if any(pub in rel_lower for pub in ['public/', 'static/', 'www/', 'dist/', 'assets/']):
                    findings_by_file.setdefault(rel_path, []).append(
                        (1, f"Exposed SQLite database file '{file}' in public directory (Critical: allows arbitrary database download)")
                    )
            
            # 2. Check for Firebase Firestore/Storage rules
            if file in ['firestore.rules', 'storage.rules']:
                file_findings = scan_firebase_rules(file_path)
                if file_findings:
                    findings_by_file[rel_path] = file_findings
                    
            # 3. Check for Firebase Realtime Database rules
            elif file == 'database.rules.json':
                file_findings = scan_rtdb_rules(file_path)
                if file_findings:
                    findings_by_file[rel_path] = file_findings
                    
            # 4. Check for SQL migrations/schema files
            elif file.endswith('.sql'):
                # In server-only ORM stacks (Prisma/Drizzle/Neon) without Supabase, suppress RLS missing warnings on standard migration tables
                is_supabase_migration = 'supabase' in rel_path.lower()
                if is_supabase_migration or context['has_supabase'] or not context['has_server_orm']:
                    file_findings = scan_sql_rls(file_path)
                    if file_findings:
                        findings_by_file[rel_path] = file_findings

            # 5. Check JS/TS/Py files for NoSQL injection and insecure SSL configs
            elif any(file.endswith(ext) for ext in ['.js', '.ts', '.jsx', '.tsx', '.py']):
                if file in ['check_db_config.py', 'scan_secrets.py', 'check_auth_patterns.py', 'check_payment_config.py']:
                    continue
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        for line_num, line in enumerate(f, 1):
                            if MONGO_INJECTION_PATTERN.search(line):
                                findings_by_file.setdefault(rel_path, []).append(
                                    (line_num, "Potential NoSQL/MongoDB injection: unescaped request body passed directly to query")
                                )
                            if INSECURE_DB_SSL.search(line):
                                findings_by_file.setdefault(rel_path, []).append(
                                    (line_num, "Insecure database connection: SSL is disabled or certificate verification is bypassed")
                                )
                except Exception:
                    pass
                    
    # Output findings
    if not findings_by_file:
        print("PASS: No database security misconfigurations detected in configuration files.")
        sys.exit(0)
        
    print("FAIL: The following database security issues were found:")
    for rel_path, file_findings in findings_by_file.items():
        for line_num, desc in file_findings:
            print(f"{rel_path}:{line_num}: {desc}")
    sys.exit(1)

if __name__ == '__main__':
    main()
