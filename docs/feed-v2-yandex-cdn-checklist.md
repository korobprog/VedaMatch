# Feed v2 + Yandex CDN Setup Checklist

## 1. Required secrets
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`

## 2. Required env
```env
S3_ENDPOINT=storage.yandexcloud.net
S3_REGION=ru-central1
S3_BUCKET_NAME=vedamatch-media
S3_ACCESS_KEY=<secret>
S3_SECRET_KEY=<secret>
S3_PUBLIC_URL=https://cdn.vedamatch.ru
CDN_ENABLED=true
CDN_BASE_URL=https://cdn.vedamatch.ru
```

## 3. DNS / CDN
1. Create CDN resource in Yandex Cloud.
2. Origin: Object Storage bucket `vedamatch-media`.
3. Custom domain: `cdn.vedamatch.ru`.
4. Add DNS CNAME:
   - `cdn.vedamatch.ru -> <resource-id>.cdn.yandex.net`

## 4. Cache policies
- `jpg/webp/avif/mp4/m4a/mp3`: `Cache-Control: public, max-age=31536000, immutable`
- `m3u8`: `Cache-Control: public, max-age=30`
- `ts/m4s`: `Cache-Control: public, max-age=300`

## 5. API
- Feed v2 endpoint: `GET /api/v2/feed`
- Video circles policy:
  - `POST /api/video-circles/upload` uses fail-fast S3/CDN upload in production (no local `/uploads` fallback).
  - `POST /api/video-circles` accepts media URLs only from `CDN_BASE_URL` or `S3_PUBLIC_URL` (S3 normalized to CDN).
- Admin feed control:
  - `GET/PUT /api/admin/feed/config`
  - `GET /api/admin/feed/metrics`
  - `POST /api/admin/feed/rebuild`
  - `GET /api/admin/feed/cdn-health`

## 6. Metrics (Video Circles + CDN)
- `video_circles_created_total`
- `video_circles_create_rejected_non_cdn_total`
- `video_circles_upload_s3_fail_total`
- `video_circles_non_cdn_detected_total`
- `GET /api/admin/feed/cdn-health` now includes:
  - `videoCirclesCdnReady`
  - `videoCirclesUrlPolicy` (`cdn_only` or `misconfigured`)

## 7. Validation
```bash
curl -I https://cdn.vedamatch.ru/path/to/file.jpg
curl -H 'Authorization: Bearer <token>' 'https://api.vedamatch.ru/api/v2/feed?limit=10'
```

## 8. Workers smoke
```bash
# Local/dev
docker compose up -d postgres redis server feed-worker media-worker
docker compose logs -f feed-worker media-worker

# Health endpoint
curl -H "Authorization: Bearer <admin_token>" \
  https://api.vedamatch.ru/api/admin/feed/workers-health
```
