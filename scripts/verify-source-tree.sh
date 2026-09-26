#!/usr/bin/env bash
set -euo pipefail

required=(
  package.json
  package-lock.json
  client
  client/src
  server
  shared
)

missing=0
for path in "${required[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "missing required source path: $path" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "source tree complete"
