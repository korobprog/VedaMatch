#!/bin/sh
set -eu

root="${1:-.}"

fail() {
  echo "Union web source guard failed: $*" >&2
  echo "Expected production Union source from feat/union-web-prod, not an older main snapshot." >&2
  exit 1
}

require_file() {
  path="$root/$1"
  [ -f "$path" ] || fail "missing $1"
}

require_text() {
  path="$root/$1"
  pattern="$2"
  grep -Fq "$pattern" "$path" || fail "$1 does not contain required marker: $pattern"
}

require_file "apps/web/src/components/union-public-home.tsx"
require_file "apps/web/src/components/union-app-frame.tsx"
require_file "apps/web/src/components/union-dashboard.tsx"
require_file "apps/web/src/components/union-profile-form.tsx"
require_file "apps/web/src/components/union-requests.tsx"
require_file "apps/web/src/app/app/union/page.tsx"
require_file "apps/web/src/app/app/union/profile/page.tsx"
require_file "apps/web/src/app/app/union/requests/page.tsx"
require_file "apps/web/src/app/app/dating/browse/page.tsx"
require_file "apps/web/src/app/app/dating/likes/page.tsx"
require_file "apps/web/src/app/app/dating/meetings/page.tsx"
require_file "apps/web/src/app/app/dating/[candidateId]/page.tsx"

require_text "apps/web/src/app/page.tsx" "UnionPublicHome"
require_text "apps/web/src/app/app/page.tsx" "redirect(\"/app/union\")"
require_text "apps/web/src/lib/request-surface.ts" "host === \"union.vedamatch.ru\""
require_text "apps/web/src/lib/request-surface.ts" "host === \"union.vedamatch.com\""
require_text "apps/web/src/components/union-public-home.tsx" "Осознанные знакомства без лишнего шума"
require_text "apps/web/src/components/union-app-frame.tsx" "href=\"/app/union\""

echo "Union web source guard passed."
