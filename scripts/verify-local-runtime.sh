#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-http://127.0.0.1:8080/client/index.html}"
html="$(curl --fail --silent --show-error "$base_url")"

if [[ "$html" != *'<html'* && "$html" != *'<!doctype html'* && "$html" != *'<!DOCTYPE html'* ]]; then
  echo "local runtime did not return HTML" >&2
  exit 1
fi

echo "local runtime reachable: $base_url"
