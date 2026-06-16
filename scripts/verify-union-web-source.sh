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

forbid_file() {
  path="$root/$1"
  [ ! -e "$path" ] || fail "found forbidden old file $1"
}

require_text() {
  path="$root/$1"
  pattern="$2"
  grep -Fq "$pattern" "$path" || fail "$1 does not contain required marker: $pattern"
}

forbid_text() {
  path="$root/$1"
  pattern="$2"
  ! grep -Fq "$pattern" "$path" || fail "$1 contains forbidden old marker: $pattern"
}

require_file "apps/web/src/components/union-public-home.tsx"
require_file "apps/web/src/components/union-app-frame.tsx"
require_file "apps/web/src/components/union-dashboard.tsx"
require_file "apps/web/src/components/union-notice.tsx"
require_file "apps/web/src/components/union-profile-form.tsx"
require_file "apps/web/src/components/union-requests.tsx"
require_file "apps/web/src/components/union-skeleton.tsx"
require_file "apps/web/src/lib/location-suggestions.ts"
require_file "apps/web/src/lib/media.ts"
require_file "apps/web/src/app/api/locations/cities/route.ts"
require_file "apps/web/src/app/api/locations/countries/route.ts"
require_file "apps/web/src/app/app/union/page.tsx"
require_file "apps/web/src/app/app/union/profile/page.tsx"
require_file "apps/web/src/app/app/union/requests/page.tsx"
forbid_file "apps/web/src/app/app/dating/browse/page.tsx"
forbid_file "apps/web/src/components/union-browse.tsx"
forbid_file "apps/web/src/components/union-dating-nav.tsx"

require_text "apps/web/src/app/page.tsx" "UnionPublicHome"
require_text "apps/web/src/app/app/page.tsx" "redirect(\"/app/union\")"
require_text "apps/web/src/lib/request-surface.ts" "resolvedSurface === \"local\" ? \"union\""
require_text "packages/api-client/src/index.ts" "normalized === \"union.vedamatch.ru\""
require_text "packages/api-client/src/index.ts" "normalized === \"union.vedamatch.com\""
require_text "packages/i18n/src/index.ts" "publicTitle: \"Осознанные знакомства в благости\""
require_text "apps/web/src/components/union-public-home.tsx" "copy.publicTitle"
require_text "apps/web/src/components/union-public-home.tsx" "union-public-hero__photo"
require_text "apps/web/src/components/union-app-frame.tsx" "href=\"/app/union\""
require_text "apps/web/src/components/union-app-frame.tsx" "listDatingChatRequests"
forbid_text "packages/i18n/src/index.ts" "Осознанные знакомства без лишнего шума"
forbid_text "apps/web/src/app/globals.css" "photo-1517486808906-6ca8b3f04846"

echo "Union web source guard passed."
