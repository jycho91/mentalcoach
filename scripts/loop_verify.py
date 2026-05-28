#!/usr/bin/env python3
"""
RegulMate — loop_verify.py

Implements the Ralph-style looping verify→fix→verify flow.
Each iteration checks acceptance criteria; if any fail, it applies
the minimum fix and loops again. Exits when all criteria pass or
MAX_ITERATIONS is reached.

Usage:
    python scripts/loop_verify.py
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRD_PATH = os.path.join(ROOT, ".omc", "prd.json")
MAX_ITERATIONS = 5


# ── Checkers ──────────────────────────────────────────────────────────────────

def check_test_runner():
    """Story s1: test runner is configured."""
    issues = []

    pkg_path = os.path.join(ROOT, "package.json")
    with open(pkg_path) as f:
        pkg = json.load(f)

    if "test" not in pkg.get("scripts", {}):
        issues.append(("package.json missing 'test' script", fix_add_test_script))

    if not os.path.exists(os.path.join(ROOT, "jest.config.ts")):
        issues.append(("jest.config.ts not found", fix_create_jest_config))

    dev = pkg.get("devDependencies", {})
    if "jest" not in dev or "ts-jest" not in dev:
        issues.append(("jest/ts-jest missing from devDependencies", None))

    return issues


def check_test_coverage():
    """Story s2: utils.test.ts exists and has assertions."""
    issues = []

    test_path = os.path.join(ROOT, "src", "__tests__", "utils.test.ts")
    if not os.path.exists(test_path):
        issues.append(("src/__tests__/utils.test.ts not found", fix_create_utils_test))
        return issues

    with open(test_path, encoding="utf-8") as f:
        content = f.read()

    assertion_count = content.count("expect(")
    if assertion_count < 3:
        issues.append((
            f"utils.test.ts has only {assertion_count} assertion(s), need ≥ 3",
            None
        ))

    return issues


def check_health_docs():
    """Story s3: CLAUDE.md has Health Stack section."""
    issues = []

    claude_md = os.path.join(ROOT, "CLAUDE.md")
    if not os.path.exists(claude_md):
        issues.append(("CLAUDE.md not found", fix_create_claude_md))
        return issues

    with open(claude_md, encoding="utf-8") as f:
        content = f.read()

    if "## Health Stack" not in content:
        issues.append(("CLAUDE.md missing '## Health Stack' section", None))

    return issues


# ── Fixers ────────────────────────────────────────────────────────────────────

def fix_add_test_script():
    pkg_path = os.path.join(ROOT, "package.json")
    with open(pkg_path) as f:
        pkg = json.load(f)
    pkg.setdefault("scripts", {})["test"] = "jest --passWithNoTests"
    with open(pkg_path, "w") as f:
        json.dump(pkg, f, indent=2, ensure_ascii=False)
    print("    [FIX] Added 'test' script to package.json")


def fix_create_jest_config():
    path = os.path.join(ROOT, "jest.config.ts")
    with open(path, "w") as f:
        f.write("import type { Config } from 'jest'\n\n")
        f.write("const config: Config = {\n")
        f.write("  preset: 'ts-jest',\n")
        f.write("  testEnvironment: 'node',\n")
        f.write("  testMatch: ['**/__tests__/**/*.test.ts'],\n")
        f.write("  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },\n")
        f.write("}\nexport default config\n")
    print("    [FIX] Created jest.config.ts")


def fix_create_utils_test():
    test_dir = os.path.join(ROOT, "src", "__tests__")
    os.makedirs(test_dir, exist_ok=True)
    path = os.path.join(test_dir, "utils.test.ts")
    with open(path, "w") as f:
        f.write("import { cn } from '@/lib/utils'\n\n")
        f.write("describe('cn()', () => {\n")
        f.write("  it('merges classes', () => expect(cn('a', 'b')).toBe('a b'))\n")
        f.write("  it('handles falsy', () => expect(cn('a', false && 'b')).toBe('a'))\n")
        f.write("  it('resolves conflicts', () => expect(cn('py-2', 'py-3')).toBe('py-3'))\n")
        f.write("})\n")
    print("    [FIX] Created src/__tests__/utils.test.ts")


def fix_create_claude_md():
    path = os.path.join(ROOT, "CLAUDE.md")
    with open(path, "w") as f:
        f.write("# RegulMate\n\n## Health Stack\n\n")
        f.write("```\ntypecheck: tsc --noEmit\nlint: next lint\n")
        f.write("test: jest --passWithNoTests\ndeadcode: knip\n```\n")
    print("    [FIX] Created CLAUDE.md with Health Stack")


# ── Loop ──────────────────────────────────────────────────────────────────────

STORIES = [
    ("s1 - Test runner configured", check_test_runner),
    ("s2 - Test coverage exists",   check_test_coverage),
    ("s3 - Health docs present",    check_health_docs),
]


def run_loop():
    print("=" * 56)
    print("  RegulMate | Ralph Loop  (verify -> fix -> verify)")
    print("=" * 56)

    for iteration in range(1, MAX_ITERATIONS + 1):
        print(f"\n-- Iteration {iteration} " + "-" * 38)
        all_pass = True

        for story_label, checker in STORIES:
            issues = checker()
            if issues:
                all_pass = False
                print(f"  [FAIL] {story_label}")
                for msg, fixer in issues:
                    print(f"    • {msg}")
                    if fixer:
                        fixer()
            else:
                print(f"  [PASS] {story_label}")

        if all_pass:
            print(f"\n[OK] All stories pass. Completed in {iteration} iteration(s).")
            return 0

    print(f"\n[FAIL] Still failing after {MAX_ITERATIONS} iterations. Review issues above.")
    return 1


if __name__ == "__main__":
    sys.exit(run_loop())
