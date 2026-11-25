#!/usr/bin/env bash
# Turns on the repository's git hooks (.githooks/pre-commit: blocks .env files and credentials).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
chmod +x .githooks/*
git config core.hooksPath .githooks
echo "git hooks enabled (core.hooksPath = .githooks)"
