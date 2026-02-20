#!/usr/bin/env bash
set -euo pipefail

# Yatra user-path smoke runner.
# Covers: publish -> join -> approve/reject -> chat -> broadcast -> remove.
# Requires: curl, jq
#
# Env vars:
# API_BASE              default: http://localhost:8081/api
# ORGANIZER_TOKEN       required
# PILGRIM_TOKEN         required
# SECOND_PILGRIM_TOKEN  optional (for reject path)
# ADMIN_TOKEN           optional (for yatra push health)

API_BASE="${API_BASE:-http://localhost:8081/api}"
ORGANIZER_TOKEN="${ORGANIZER_TOKEN:-}"
PILGRIM_TOKEN="${PILGRIM_TOKEN:-}"
SECOND_PILGRIM_TOKEN="${SECOND_PILGRIM_TOKEN:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required"
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required"
  exit 1
fi
if [[ -z "${ORGANIZER_TOKEN}" || -z "${PILGRIM_TOKEN}" ]]; then
  echo "ERROR: ORGANIZER_TOKEN and PILGRIM_TOKEN are required"
  exit 1
fi

PASS=0
FAIL=0
YATRA_ID=""
APPROVED_PARTICIPANT_ID=""
REJECTED_PARTICIPANT_ID=""

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

  local out_file
  out_file="$(mktemp)"
  local status

  if [[ -n "${body}" ]]; then
    if [[ -n "${token}" ]]; then
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" \
        -X "${method}" "${url}" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        --data "${body}")"
    else
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" \
        -X "${method}" "${url}" \
        -H "Content-Type: application/json" \
        --data "${body}")"
    fi
  else
    if [[ -n "${token}" ]]; then
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" \
        -X "${method}" "${url}" \
        -H "Authorization: Bearer ${token}")"
    else
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" -X "${method}" "${url}")"
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

cleanup() {
  if [[ -n "${YATRA_ID}" ]]; then
    local resp status
    resp="$(request DELETE "${API_BASE}/yatra/${YATRA_ID}" "${ORGANIZER_TOKEN}")"
    status="$(echo "${resp}" | sed -n '1p')"
    if [[ "${status}" == "200" ]]; then
      echo "[INFO] Cleanup deleted yatra ${YATRA_ID}"
    else
      echo "[WARN] Cleanup failed for yatra ${YATRA_ID} (status=${status})"
    fi
  fi
}
trap cleanup EXIT

echo "Running Yatra user-path smoke against: ${API_BASE}"

create_payload="$(jq -nc \
  --arg title "QA Yatra $(date +%s)" \
  --arg desc "qa smoke yatra" \
  '{
    title:$title,
    description:$desc,
    theme:"vrindavan",
    startDate:"2030-01-10",
    endDate:"2030-01-14",
    startCity:"Vrindavan",
    endCity:"Mayapur",
    maxParticipants:10,
    minParticipants:1,
    language:"en"
  }')"

resp="$(request POST "${API_BASE}/yatra" "${ORGANIZER_TOKEN}" "${create_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
body="$(echo "${resp}" | sed -n '2,$p')"
if [[ "${status}" == "201" ]]; then
  YATRA_ID="$(extract_json_field "${body}" '.id // empty')"
  step_ok "POST /yatra (create draft, yatraId=${YATRA_ID})"
else
  step_fail "POST /yatra (status=${status})"
  echo "Yatra smoke summary: PASS=${PASS} FAIL=${FAIL}"
  exit 1
fi

resp="$(request POST "${API_BASE}/yatra/${YATRA_ID}/publish" "${ORGANIZER_TOKEN}" '{}')"
status="$(echo "${resp}" | sed -n '1p')"
[[ "${status}" == "200" ]] && step_ok "POST /yatra/:id/publish" || step_fail "POST /yatra/:id/publish (status=${status})"

resp="$(request POST "${API_BASE}/yatra/${YATRA_ID}/join" "${PILGRIM_TOKEN}" '{"message":"please approve"}')"
status="$(echo "${resp}" | sed -n '1p')"
body="$(echo "${resp}" | sed -n '2,$p')"
if [[ "${status}" == "201" ]]; then
  APPROVED_PARTICIPANT_ID="$(extract_json_field "${body}" '.id // empty')"
  step_ok "POST /yatra/:id/join (pending participant=${APPROVED_PARTICIPANT_ID})"
else
  step_fail "POST /yatra/:id/join (status=${status})"
fi

if [[ -n "${SECOND_PILGRIM_TOKEN}" ]]; then
  resp="$(request POST "${API_BASE}/yatra/${YATRA_ID}/join" "${SECOND_PILGRIM_TOKEN}" '{"message":"please review"}')"
  status="$(echo "${resp}" | sed -n '1p')"
  body="$(echo "${resp}" | sed -n '2,$p')"
  if [[ "${status}" == "201" ]]; then
    REJECTED_PARTICIPANT_ID="$(extract_json_field "${body}" '.id // empty')"
    step_ok "POST /yatra/:id/join second pilgrim"
  else
    step_fail "POST /yatra/:id/join second pilgrim (status=${status})"
  fi
fi

if [[ -n "${APPROVED_PARTICIPANT_ID}" ]]; then
  resp="$(request POST "${API_BASE}/yatra/${YATRA_ID}/participants/${APPROVED_PARTICIPANT_ID}/approve" "${ORGANIZER_TOKEN}" '{}')"
  status="$(echo "${resp}" | sed -n '1p')"
  [[ "${status}" == "200" ]] && step_ok "POST /approve" || step_fail "POST /approve (status=${status})"
fi

if [[ -n "${REJECTED_PARTICIPANT_ID}" ]]; then
  resp="$(request POST "${API_BASE}/yatra/${YATRA_ID}/participants/${REJECTED_PARTICIPANT_ID}/reject" "${ORGANIZER_TOKEN}" '{}')"
  status="$(echo "${resp}" | sed -n '1p')"
  [[ "${status}" == "200" ]] && step_ok "POST /reject" || step_fail "POST /reject (status=${status})"
fi

resp="$(request GET "${API_BASE}/yatra/${YATRA_ID}/chat" "${PILGRIM_TOKEN}")"
status="$(echo "${resp}" | sed -n '1p')"
body="$(echo "${resp}" | sed -n '2,$p')"
can_access="$(extract_json_field "${body}" '.canAccess // false')"
if [[ "${status}" == "200" && "${can_access}" == "true" ]]; then
  step_ok "GET /yatra/:id/chat (approved pilgrim can access)"
else
  step_fail "GET /yatra/:id/chat (status=${status}, canAccess=${can_access})"
fi

broadcast_payload='{"title":"QA broadcast","body":"Meet near temple gate","target":"approved"}'
resp="$(request POST "${API_BASE}/yatra/${YATRA_ID}/broadcast" "${ORGANIZER_TOKEN}" "${broadcast_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
body="$(echo "${resp}" | sed -n '2,$p')"
delivered="$(extract_json_field "${body}" '.delivered // 0')"
if [[ "${status}" == "200" && "${delivered}" != "0" ]]; then
  step_ok "POST /yatra/:id/broadcast (delivered=${delivered})"
else
  step_fail "POST /yatra/:id/broadcast (status=${status}, delivered=${delivered})"
fi

if [[ -n "${APPROVED_PARTICIPANT_ID}" ]]; then
  resp="$(request DELETE "${API_BASE}/yatra/${YATRA_ID}/participants/${APPROVED_PARTICIPANT_ID}" "${ORGANIZER_TOKEN}")"
  status="$(echo "${resp}" | sed -n '1p')"
  [[ "${status}" == "200" ]] && step_ok "DELETE /participants/:participantId" || step_fail "DELETE /participants/:participantId (status=${status})"

  resp="$(request GET "${API_BASE}/yatra/${YATRA_ID}/chat" "${PILGRIM_TOKEN}")"
  status="$(echo "${resp}" | sed -n '1p')"
  body="$(echo "${resp}" | sed -n '2,$p')"
  can_access="$(extract_json_field "${body}" '.canAccess // true')"
  if [[ "${status}" == "200" && "${can_access}" == "false" ]]; then
    step_ok "GET /yatra/:id/chat after remove (access revoked)"
  else
    step_fail "GET /yatra/:id/chat after remove (status=${status}, canAccess=${can_access})"
  fi
fi

if [[ -n "${ADMIN_TOKEN}" ]]; then
  resp="$(request GET "${API_BASE}/admin/push/health/yatra?window_hours=24" "${ADMIN_TOKEN}")"
  status="$(echo "${resp}" | sed -n '1p')"
  [[ "${status}" == "200" ]] && step_ok "GET /admin/push/health/yatra" || step_fail "GET /admin/push/health/yatra (status=${status})"
else
  echo "[INFO] Skipping admin push-health check (ADMIN_TOKEN is empty)"
fi

echo
echo "Yatra smoke summary: PASS=${PASS} FAIL=${FAIL}"
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
