-- Video Circles CDN migration (one-shot)
-- Usage:
--   1) Replace {{S3_PUBLIC_URL}} and {{CDN_BASE_URL}} with real values.
--   2) Run dry-run queries first.
--   3) Execute UPDATE statements.
--   4) Run post-check queries.

-- =========================
-- Dry-run: pre-migration
-- =========================

-- Count URLs that still use S3 public origin and can be normalized to CDN.
SELECT
  COUNT(*) AS media_url_s3_count
FROM video_circles
WHERE media_url LIKE '{{S3_PUBLIC_URL}}/%';

SELECT
  COUNT(*) AS thumbnail_url_s3_count
FROM video_circles
WHERE thumbnail_url LIKE '{{S3_PUBLIC_URL}}/%';

-- Count local URLs and unsupported hosts (manual remediation list).
SELECT
  COUNT(*) AS media_url_local_count
FROM video_circles
WHERE media_url LIKE '/uploads/%';

SELECT
  COUNT(*) AS thumbnail_url_local_count
FROM video_circles
WHERE thumbnail_url LIKE '/uploads/%';

-- Sample rows requiring remediation (non-CDN/non-S3).
SELECT id, media_url, thumbnail_url, created_at
FROM video_circles
WHERE (media_url IS NOT NULL AND media_url <> '' AND media_url NOT LIKE '{{CDN_BASE_URL}}/%' AND media_url NOT LIKE '{{S3_PUBLIC_URL}}/%')
   OR (thumbnail_url IS NOT NULL AND thumbnail_url <> '' AND thumbnail_url NOT LIKE '{{CDN_BASE_URL}}/%' AND thumbnail_url NOT LIKE '{{S3_PUBLIC_URL}}/%')
ORDER BY id DESC
LIMIT 100;

-- =========================
-- Migration: normalize S3 -> CDN
-- =========================

UPDATE video_circles
SET media_url = REPLACE(media_url, '{{S3_PUBLIC_URL}}', '{{CDN_BASE_URL}}')
WHERE media_url LIKE '{{S3_PUBLIC_URL}}/%';

UPDATE video_circles
SET thumbnail_url = REPLACE(thumbnail_url, '{{S3_PUBLIC_URL}}', '{{CDN_BASE_URL}}')
WHERE thumbnail_url LIKE '{{S3_PUBLIC_URL}}/%';

-- =========================
-- Post-check
-- =========================

SELECT
  COUNT(*) AS media_url_non_cdn_count
FROM video_circles
WHERE media_url IS NOT NULL
  AND media_url <> ''
  AND media_url NOT LIKE '{{CDN_BASE_URL}}/%';

SELECT
  COUNT(*) AS thumbnail_url_non_cdn_count
FROM video_circles
WHERE thumbnail_url IS NOT NULL
  AND thumbnail_url <> ''
  AND thumbnail_url NOT LIKE '{{CDN_BASE_URL}}/%';
