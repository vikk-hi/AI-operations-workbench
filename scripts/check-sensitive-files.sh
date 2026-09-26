#!/usr/bin/env bash
set -euo pipefail

blocked='(^|/)(\.env($|\.)|cookies?\.json$|.*\.log$|node_modules/|dist/|build/|\.DS_Store$)'
tracked="$(git ls-files)"

if printf '%s\n' "$tracked" | grep -E "$blocked" | grep -vE '(^|/)\.env\.example$'; then
  echo "blocked sensitive or generated file is tracked" >&2
  exit 1
fi

if git grep -nE 'sso_token=|Authorization:[[:space:]]*Bearer|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' -- . ':!package-lock.json' ':!scripts/check-sensitive-files.sh' ':!docs/superpowers/**'; then
  echo "credential-like content found in tracked files" >&2
  exit 1
fi

echo "sensitive-file check passed"
