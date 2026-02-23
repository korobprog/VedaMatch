#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"

endpoints=(
  "/api/news?page=1&limit=20"
  "/api/news/latest?limit=5"
  "/api/services?page=1&limit=20"
  "/api/feed?page=1&limit=20"
)

failed=0

echo "[preflight] base_url=${BASE_URL}"
for endpoint in "${endpoints[@]}"; do
  status_code="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}${endpoint}")"
  echo "${status_code} ${endpoint}"

  if [[ "${status_code}" == "401" || "${status_code}" == "403" ]]; then
    failed=1
  fi
done

if [[ "${failed}" -eq 1 ]]; then
  echo "[preflight] failed: public endpoints returned unauthorized status" >&2
  exit 1
fi

echo "[preflight] ok"
