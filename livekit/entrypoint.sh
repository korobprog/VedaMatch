#!/bin/sh
set -eu

has_flag() {
  flag="$1"
  shift

  for arg in "$@"; do
    if [ "$arg" = "$flag" ]; then
      return 0
    fi
  done

  return 1
}

normalize_keys() {
  if [ -n "${LIVEKIT_API_KEY:-}" ] && [ -n "${LIVEKIT_API_SECRET:-}" ]; then
    printf '%s: %s' "$LIVEKIT_API_KEY" "$LIVEKIT_API_SECRET"
    return 0
  fi

  if [ -z "${LIVEKIT_KEYS:-}" ]; then
    return 1
  fi

  case "$LIVEKIT_KEYS" in
    *": "*)
      printf '%s' "$LIVEKIT_KEYS"
      return 0
      ;;
    *:*)
      key_part=${LIVEKIT_KEYS%%:*}
      secret_part=${LIVEKIT_KEYS#*:}
      while [ "${secret_part# }" != "$secret_part" ]; do
        secret_part=${secret_part# }
      done
      printf '%s: %s' "$key_part" "$secret_part"
      return 0
      ;;
  esac

  return 1
}

if normalized_keys="$(normalize_keys)"; then
  export LIVEKIT_KEYS="$normalized_keys"
fi

node_ip="${LIVEKIT_NODE_IP:-${NODE_IP:-}}"
udp_port="${LIVEKIT_UDP_PORT:-${UDP_PORT:-7882}}"

if [ -n "$node_ip" ] && ! has_flag "--node-ip" "$@"; then
  set -- --node-ip "$node_ip" "$@"
fi

if [ -n "$udp_port" ] && ! has_flag "--udp-port" "$@"; then
  set -- --udp-port "$udp_port" "$@"
fi

exec /livekit-server "$@"
