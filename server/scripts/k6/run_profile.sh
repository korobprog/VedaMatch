#!/usr/bin/env bash
set -euo pipefail

PROFILE="${1:-mixed}"
BASE_URL="${BASE_URL:-http://localhost:8080}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
mkdir -p "${RESULTS_DIR}"

timestamp="$(date +%Y%m%d-%H%M%S)"
summary_file="${RESULTS_DIR}/${PROFILE}-${timestamp}.summary.json"
ALLOW_THRESHOLD_FAILURE="${ALLOW_THRESHOLD_FAILURE:-1}"

duration_default="3m"
public_rps_default="25"
public_preallocated_vus_default="30"
public_max_vus_default="160"
auth_vus_default="8"
cache_vus_default="4"
enable_auth_default="1"
enable_conditional_cache_default="1"

case "${PROFILE}" in
  baseline)
    public_rps_default="10"
    auth_vus_default="0"
    cache_vus_default="0"
    enable_auth_default="0"
    enable_conditional_cache_default="0"
    ;;
  mixed)
    ;;
  stress)
    public_rps_default="60"
    public_preallocated_vus_default="60"
    public_max_vus_default="250"
    auth_vus_default="20"
    cache_vus_default="8"
    duration_default="5m"
    ;;
  cache)
    public_rps_default="0"
    auth_vus_default="0"
    cache_vus_default="6"
    enable_auth_default="0"
    enable_conditional_cache_default="1"
    ;;
  *)
    echo "Unknown profile: ${PROFILE}"
    echo "Usage: $0 [baseline|mixed|stress|cache]"
    exit 1
    ;;
esac

DURATION="${DURATION:-${duration_default}}"
PUBLIC_RPS="${PUBLIC_RPS:-${public_rps_default}}"
PUBLIC_PREALLOCATED_VUS="${PUBLIC_PREALLOCATED_VUS:-${public_preallocated_vus_default}}"
PUBLIC_MAX_VUS="${PUBLIC_MAX_VUS:-${public_max_vus_default}}"
AUTH_VUS="${AUTH_VUS:-${auth_vus_default}}"
CACHE_VUS="${CACHE_VUS:-${cache_vus_default}}"
ENABLE_AUTH="${ENABLE_AUTH:-${enable_auth_default}}"
ENABLE_CONDITIONAL_CACHE="${ENABLE_CONDITIONAL_CACHE:-${enable_conditional_cache_default}}"

echo "[k6] profile=${PROFILE} base_url=${BASE_URL} duration=${DURATION}"
echo "[k6] params: public_rps=${PUBLIC_RPS} preallocated_vus=${PUBLIC_PREALLOCATED_VUS} max_vus=${PUBLIC_MAX_VUS} auth_vus=${AUTH_VUS} cache_vus=${CACHE_VUS} enable_auth=${ENABLE_AUTH} enable_conditional_cache=${ENABLE_CONDITIONAL_CACHE}"
echo "[k6] summary export -> ${summary_file}"

exit_code=0
docker run --rm -i \
  -e BASE_URL="${BASE_URL}" \
  -e DURATION="${DURATION}" \
  -e PUBLIC_RPS="${PUBLIC_RPS}" \
  -e PUBLIC_PREALLOCATED_VUS="${PUBLIC_PREALLOCATED_VUS}" \
  -e PUBLIC_MAX_VUS="${PUBLIC_MAX_VUS}" \
  -e ENABLE_AUTH="${ENABLE_AUTH}" \
  -e AUTH_TOKEN="${AUTH_TOKEN}" \
  -e AUTH_VUS="${AUTH_VUS}" \
  -e ENABLE_CONDITIONAL_CACHE="${ENABLE_CONDITIONAL_CACHE}" \
  -e CACHE_VUS="${CACHE_VUS}" \
  -v "${ROOT_DIR}:/work" \
  grafana/k6 run /work/server/scripts/k6/hot_endpoints.js \
  --summary-export "/work/server/scripts/k6/results/$(basename "${summary_file}")" || exit_code=$?

if [[ "${exit_code}" -eq 99 && "${ALLOW_THRESHOLD_FAILURE}" == "1" ]]; then
  echo "[k6] thresholds crossed (exit 99), keeping summary for analysis"
  exit_code=0
fi

echo "[k6] done: ${summary_file}"
exit "${exit_code}"
