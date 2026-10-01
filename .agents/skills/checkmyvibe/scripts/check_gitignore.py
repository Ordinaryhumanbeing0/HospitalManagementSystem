#!/usr/bin/env python3
import os
import sys
import fnmatch
import subprocess

# Ensure stdout supports UTF-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def is_tracked_by_git(file_rel_path, repo_root):
    """Check if a file is actively tracked in git index even if listed in .gitignore."""
    try:
        res = subprocess.run(
            ['git', 'ls-files', '--error-unmatch', file_rel_path],
            cwd=repo_root,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False
        )
        return res.returncode == 0
    except Exception:
        return False

# Potential local secret file patterns (glob format)
SECRET_PATTERNS = [
    '.env',
    '.env.*',
    '*service-account*.json',
    '*serviceAccount*.json',
    '*credentials*.json',
    '*.pem',
    '*.key',
    '*.p12',
    'secrets.json',
    'jwt_key*',
]

# Patterns that are allowed to be public (not secrets)
PUBLIC_EXCEPTIONS = [
    '*.example',
    '*.template',
    '*.sample',
    '*.dist',
    '*.config.json',
    'firebase.json',
]

def is_secret_file(filename):
    """Check if filename matches secret patterns and doesn't match public exceptions."""
    is_secret = False
    for pat in SECRET_PATTERNS:
        if fnmatch.fnmatch(filename, pat):
            is_secret = True
            break
            
    if not is_secret:
        return False
        
    for pat in PUBLIC_EXCEPTIONS:
        if fnmatch.fnmatch(filename, pat):
            return False
            
    return True

def parse_gitignore(gitignore_path):
    """Read and parse the .gitignore patterns, skipping comments and empty lines."""
    patterns = []
    if not os.path.exists(gitignore_path):
        return patterns
        
    with open(gitignore_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            # Strip inline comments
            if ' #' in line:
                line = line.split(' #')[0].strip()
            patterns.append(line)
    return patterns

def is_ignored(file_rel_path, gitignore_patterns):
    """Verify if a relative file path matches any .gitignore pattern."""
    ignored = False
    parts = file_rel_path.split(os.sep)
    
    # Hardcoded check for system folders that are assumed ignored
    if 'node_modules' in parts or '.git' in parts or 'dist' in parts or 'build' in parts:
        return True

    for pattern in gitignore_patterns:
        negate = False
        if pattern.startswith('!'):
            negate = True
            pattern = pattern[1:]
            
        match = False
        if pattern.startswith('/'):
            clean_pattern = pattern[1:]
            match = fnmatch.fnmatch(file_rel_path, clean_pattern) or fnmatch.fnmatch(file_rel_path, clean_pattern + '/*')
        else:
            match = fnmatch.fnmatch(os.path.basename(file_rel_path), pattern) or \
                    fnmatch.fnmatch(file_rel_path, pattern) or \
                    fnmatch.fnmatch(file_rel_path, '*/' + pattern) or \
                    any(fnmatch.fnmatch(part, pattern) for part in parts)
                    
        if match:
            ignored = not negate
            
    return ignored

def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    target_dir = os.path.abspath(target_dir)
    
    gitignore_path = os.path.join(target_dir, '.gitignore')
    has_gitignore = os.path.exists(gitignore_path)
    gitignore_patterns = parse_gitignore(gitignore_path) if has_gitignore else []
    
    dockerignore_path = os.path.join(target_dir, '.dockerignore')
    has_dockerfile = any(
        os.path.exists(os.path.join(target_dir, f)) 
        for f in ['Dockerfile', 'docker-compose.yml', 'compose.yaml', 'compose.yml']
    )
    dockerignore_patterns = parse_gitignore(dockerignore_path) if os.path.exists(dockerignore_path) else []

    secret_files_found = []
    unignored_secrets = []
    docker_exposed_secrets = []
    npmrc_findings = []
    git_tracked_secrets = []
    
    for root, dirs, files in os.walk(target_dir):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in {'node_modules', '.git', 'dist', 'build', '.next', '.svelte-kit'}]
        
        # Check if current directory has its own .gitignore (monorepo support)
        local_gi = os.path.join(root, '.gitignore')
        active_patterns = list(gitignore_patterns)
        if root != target_dir and os.path.exists(local_gi):
            active_patterns.extend(parse_gitignore(local_gi))
            
        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, target_dir)
            
            # Check .npmrc for hardcoded auth tokens
            if file == '.npmrc':
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as nf:
                        for line in nf:
                            if '_authToken=' in line or '_auth=' in line:
                                npmrc_findings.append(f"{rel_path} contains hardcoded npm authToken")
                                break
                except Exception:
                    pass

            if is_secret_file(file):
                if is_ignored(rel_path, active_patterns):
                    secret_files_found.append((rel_path, True))
                    # Check if git is actively tracking it despite .gitignore
                    if is_tracked_by_git(rel_path, target_dir):
                        git_tracked_secrets.append(rel_path)
                else:
                    secret_files_found.append((rel_path, False))
                    unignored_secrets.append(rel_path)
                    
                # If Dockerfile is present, ensure secrets are also in .dockerignore
                if has_dockerfile:
                    if not os.path.exists(dockerignore_path) or not is_ignored(rel_path, dockerignore_patterns):
                        docker_exposed_secrets.append(rel_path)
                    
    has_issues = False
    
    if unignored_secrets:
        has_issues = True
        print("FAIL: The following local secret files are NOT excluded by .gitignore:")
        for sf in unignored_secrets:
            print(f"  - {sf}")
        if not has_gitignore:
            print("  (Note: No .gitignore file was found in the project root)")

    if git_tracked_secrets:
        has_issues = True
        print("FAIL (Git Index Leak): The following secret files are listed in .gitignore but are STILL TRACKED by Git:")
        for sf in git_tracked_secrets:
            print(f"  - {sf} (Fix: run 'git rm --cached {sf}')")
            
    if docker_exposed_secrets:
        has_issues = True
        print("FAIL (Docker Risk): Dockerfile detected, but secret files are NOT excluded in .dockerignore:")
        for sf in docker_exposed_secrets:
            print(f"  - {sf} (risk of baking secrets into container images)")
        if not os.path.exists(dockerignore_path):
            print("  (Note: No .dockerignore file was found in the project root)")

    if npmrc_findings:
        has_issues = True
        print("FAIL (NPM Credential Leak):")
        for hit in npmrc_findings:
            print(f"  - {hit}")

    if not secret_files_found and not has_issues:
        print("PASS: No local secret files (like .env) were detected in the project.")
        sys.exit(0)
        
    if has_issues:
        sys.exit(1)
        
    print("PASS: All detected local secret files are correctly listed in .gitignore and not tracked by Git:")
    for sf, ignored in secret_files_found:
        print(f"  - {sf} (ignored)")
    sys.exit(0)

if __name__ == '__main__':
    main()
