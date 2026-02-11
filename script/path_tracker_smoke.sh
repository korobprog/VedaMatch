#!/usr/bin/env bash
set -euo pipefail

# Path Tracker API smoke runner.
# Requires: curl, jq
#
# Env vars:
# API_BASE        default: http://localhost:8081/api
# USER_TOKEN      required
# ADMIN_TOKEN     optional
# TIMEZONE        default: UTC
# CLEANUP_NOTE    default: qa-smoke

API_BASE="${API_BASE:-http://localhost:8081/api}"
USER_TOKEN="${USER_TOKEN:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
TIMEZONE="${TIMEZONE:-UTC}"
CLEANUP_NOTE="${CLEANUP_NOTE:-qa-smoke}"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required"
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required"
  exit 1
fi
if [[ -z "${USER_TOKEN}" ]]; then
  echo "ERROR: USER_TOKEN is required"
  exit 1
fi

PASS=0
FAIL=0
STEP_ID=""
SUGGESTED_SERVICE_ID=""

step_ok() {
  PASS=$((PASS + 1))
  echo "[PASS] $1"
}

step_fail() {
  FAIL=$((FAIL + 1))
  echo "[FAIL] $1"
}

request() {
  local method="$1"
  local url="$2"
  local token="${3:-}"
  local body="${4:-}"
  local content_type="${5:-application/json}"

  local out_file
  out_file="$(mktemp)"
  local status

  if [[ -n "${body}" ]]; then
    if [[ -n "${token}" ]]; then
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" \
        -X "${method}" "${url}" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: ${content_type}" \
        --data "${body}")"
    else
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" \
        -X "${method}" "${url}" \
        -H "Content-Type: ${content_type}" \
        --data "${body}")"
    fi
  else
    if [[ -n "${token}" ]]; then
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" \
        -X "${method}" "${url}" \
        -H "Authorization: Bearer ${token}")"
    else
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" \
        -X "${method}" "${url}")"
    fi
  fi

  echo "${status}"
  cat "${out_file}"
  rm -f "${out_file}"
}

extract_json_field() {
  local json="$1"
  local expr="$2"
  echo "${json}" | jq -r "${expr}"
}

echo "Running Path Tracker smoke against: ${API_BASE}"

# 1) today
resp="$(request GET "${API_BASE}/path-tracker/today" "${USER_TOKEN}")"
status="$(echo "${resp}" | sed -n '1p')"
body="$(echo "${resp}" | sed -n '2,$p')"
if [[ "${status}" == "200" ]]; then
  STEP_ID="$(extract_json_field "${body}" '.step.stepId // empty')"
  SUGGESTED_SERVICE_ID="$(extract_json_field "${body}" '.step.suggestedServiceId // empty')"
  step_ok "GET /path-tracker/today"
elif [[ "${status}" == "403" ]]; then
  code="$(extract_json_field "${body}" '.code // empty')"
  step_fail "GET /path-tracker/today blocked by rollout (code=${code})"
  echo "Smoke summary: PASS=${PASS} FAIL=${FAIL}"
  exit 1
else
  step_fail "GET /path-tracker/today (status=${status})"
fi

# 2) checkin
checkin_payload="$(jq -nc \
  --arg tz "${TIMEZONE}" \
  '{moodCode:"calm", energyCode:"medium", availableMinutes:5, freeText:"'"${CLEANUP_NOTE}"'", timezone:$tz}')"
resp="$(request POST "${API_BASE}/path-tracker/checkin" "${USER_TOKEN}" "${checkin_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
if [[ "${status}" == "200" ]]; then
  step_ok "POST /path-tracker/checkin"
else
  step_fail "POST /path-tracker/checkin (status=${status})"
fi

# 3) generate-step (idempotent)
resp="$(request POST "${API_BASE}/path-tracker/generate-step" "${USER_TOKEN}" '{}')"
status="$(echo "${resp}" | sed -n '1p')"
body="$(echo "${resp}" | sed -n '2,$p')"
if [[ "${status}" == "200" ]]; then
  STEP_ID="$(extract_json_field "${body}" '.step.stepId // empty')"
  SUGGESTED_SERVICE_ID="$(extract_json_field "${body}" '.step.suggestedServiceId // empty')"
  step_ok "POST /path-tracker/generate-step (stepId=${STEP_ID})"
else
  step_fail "POST /path-tracker/generate-step (status=${status})"
fi

if [[ -z "${STEP_ID}" || "${STEP_ID}" == "null" ]]; then
  echo "Cannot continue without stepId."
  echo "Smoke summary: PASS=${PASS} FAIL=${FAIL}"
  exit 1
fi

# 4) assistant
assistant_payload="$(jq -nc --argjson id "${STEP_ID}" '{stepId:$id, requestType:"simplify"}')"
resp="$(request POST "${API_BASE}/path-tracker/assistant" "${USER_TOKEN}" "${assistant_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
if [[ "${status}" == "200" ]]; then
  step_ok "POST /path-tracker/assistant"
else
  step_fail "POST /path-tracker/assistant (status=${status})"
fi

# 5) complete
complete_payload="$(jq -nc --argjson id "${STEP_ID}" '{stepId:$id}')"
resp="$(request POST "${API_BASE}/path-tracker/complete" "${USER_TOKEN}" "${complete_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
if [[ "${status}" == "200" ]]; then
  step_ok "POST /path-tracker/complete"
else
  step_fail "POST /path-tracker/complete (status=${status})"
fi

# 6) reflect
reflect_payload="$(jq -nc --argjson id "${STEP_ID}" '{stepId:$id, resultMood:"better", reflectionText:"'"${CLEANUP_NOTE}"' reflection"}')"
resp="$(request POST "${API_BASE}/path-tracker/reflect" "${USER_TOKEN}" "${reflect_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
if [[ "${status}" == "200" ]]; then
  step_ok "POST /path-tracker/reflect"
else
  step_fail "POST /path-tracker/reflect (status=${status})"
fi

# 7) weekly summary
resp="$(request GET "${API_BASE}/path-tracker/weekly-summary" "${USER_TOKEN}")"
status="$(echo "${resp}" | sed -n '1p')"
if [[ "${status}" == "200" ]]; then
  step_ok "GET /path-tracker/weekly-summary"
else
  step_fail "GET /path-tracker/weekly-summary (status=${status})"
fi

# 8) unlock status + opened
resp="$(request GET "${API_BASE}/path-tracker/unlock-status" "${USER_TOKEN}")"
status="$(echo "${resp}" | sed -n '1p')"
body="$(echo "${resp}" | sed -n '2,$p')"
if [[ "${status}" == "200" ]]; then
  NEXT_SERVICE="$(extract_json_field "${body}" '.nextServiceId // empty')"
  step_ok "GET /path-tracker/unlock-status"
else
  NEXT_SERVICE=""
  step_fail "GET /path-tracker/unlock-status (status=${status})"
fi

if [[ -z "${SUGGESTED_SERVICE_ID}" || "${SUGGESTED_SERVICE_ID}" == "null" ]]; then
  SUGGESTED_SERVICE_ID="${NEXT_SERVICE:-news}"
fi
unlock_opened_payload="$(jq -nc --arg service "${SUGGESTED_SERVICE_ID}" '{serviceId:$service}')"
resp="$(request POST "${API_BASE}/path-tracker/unlock-opened" "${USER_TOKEN}" "${unlock_opened_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
if [[ "${status}" == "200" ]]; then
  step_ok "POST /path-tracker/unlock-opened"
else
  step_fail "POST /path-tracker/unlock-opened (status=${status})"
fi

# 9) Admin-only observability checks
if [[ -n "${ADMIN_TOKEN}" ]]; then
  resp="$(request GET "${API_BASE}/admin/path-tracker/metrics" "${ADMIN_TOKEN}")"
  status="$(echo "${resp}" | sed -n '1p')"
  [[ "${status}" == "200" ]] && step_ok "GET /admin/path-tracker/metrics" || step_fail "GET /admin/path-tracker/metrics (status=${status})"

  resp="$(request GET "${API_BASE}/admin/path-tracker/analytics?days=14" "${ADMIN_TOKEN}")"
  status="$(echo "${resp}" | sed -n '1p')"
  [[ "${status}" == "200" ]] && step_ok "GET /admin/path-tracker/analytics" || step_fail "GET /admin/path-tracker/analytics (status=${status})"

  resp="$(request GET "${API_BASE}/admin/path-tracker/ops" "${ADMIN_TOKEN}")"
  status="$(echo "${resp}" | sed -n '1p')"
  [[ "${status}" == "200" ]] && step_ok "GET /admin/path-tracker/ops" || step_fail "GET /admin/path-tracker/ops (status=${status})"

  resp="$(request GET "${API_BASE}/admin/path-tracker/alerts?page=1&pageSize=10" "${ADMIN_TOKEN}")"
  status="$(echo "${resp}" | sed -n '1p')"
  [[ "${status}" == "200" ]] && step_ok "GET /admin/path-tracker/alerts" || step_fail "GET /admin/path-tracker/alerts (status=${status})"
else
  echo "[INFO] Skipping admin checks (ADMIN_TOKEN is empty)"
fi

echo
echo "Path Tracker smoke summary: PASS=${PASS} FAIL=${FAIL}"
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
