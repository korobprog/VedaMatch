# 🎬 Media Video Platform — План разработки

> **Проект:** Vedamatch / Rag Agent  
> **Дата:** 2026-02-01  
> **Тип:** WEB + MOBILE  
> **Статус:** ✅ IN PROGRESS (Phase 1-2 Completed)

## 📊 Progress Tracker

| Phase | Status | Tasks Done |
|-------|--------|------------|
| Phase 1: Infrastructure | ✅ DONE | 4/4 |
| Phase 2: Backend API | ✅ DONE | 7/8 |
| Phase 3: Admin Panel | ⏳ TODO | 0/5 |
| Phase 4: Mobile App | ⏳ TODO | 0/6 |
| Phase 5: Testing | ⏳ TODO | 0/5 |

---

## 📋 Overview

Раздел "Медиа" для публикации видеоконтента (лекции, фильмы, киртаны, прямые эфиры). Видео загружаются через админку, автоматически транскодируются в несколько качеств (HLS), хранятся в S3, и доступны пользователям с адаптивным качеством.

### Ключевые возможности:
- ✅ Загрузка видео до 2GB через админку
- ✅ Автоматическое транскодирование (FFmpeg → HLS)
- ✅ Множество качеств: 360p, 480p, 720p, 1080p
- ✅ Генерация превью (thumbnails)
- ✅ Поддержка субтитров (VTT/SRT)
- ✅ Прогресс просмотра (resume playback)
- ✅ Опциональный CDN (вкл/выкл в админке)

---

## ✅ Success Criteria

| Критерий | Метрика |
|----------|---------|
| Загрузка видео | Видео до 2GB загружается без ошибок |
| Транскодирование | Автоматически создаются 4 качества за < 10 мин на 1 час видео |
| Воспроизведение | HLS плеер работает на iOS, Android, Web |
| Адаптивное качество | Автопереключение качества при изменении сети |
| Прогресс | Сохраняется и восстанавливается позиция |
| Субтитры | VTT файлы отображаются корректно |

---

## 🛠 Tech Stack

### Backend (Go)
| Компонент | Технология | Назначение |
|-----------|------------|------------|
| API Framework | Fiber v2 | REST API |
| Database | PostgreSQL | Метаданные видео, субтитры, прогресс |
| Cache/Queue | **Redis** ⭐ NEW | Очереди транскодирования, кэш |
| Storage | S3 (FirstVDS) | Хранение видео файлов |
| Transcoding | **FFmpeg** | Перекодировка в HLS |
| CDN | CloudFlare (опционально) | Кэширование, быстрая раздача |

### Frontend (React Native + Admin)
| Компонент | Технология |
|-----------|------------|
| Video Player | `react-native-video` (HLS support) |
| Admin UI | Next.js (существующая) |
| Progress Tracking | AsyncStorage + API sync |

### Почему НЕ MongoDB?
PostgreSQL с JSONB полями полностью покрывает наши нужды:
- Структурированные метаданные видео
- Связи (категории, авторы, субтитры)
- Транзакции для консистентности
- Уже настроена в проекте

### Почему Redis? ✅ РЕКОМЕНДУЕТСЯ
- **Очередь задач**: Транскодирование видео в фоне
- **Кэш**: Популярные видео, метаданные
- **Progress**: Быстрое сохранение позиции просмотра
- **Rate Limiting**: Защита от злоупотреблений

---

## 📁 File Structure

```
server/
├── internal/
│   ├── models/
│   │   ├── multimedia.go         # UPDATE: VideoQuality, Subtitle models
│   │   └── video_progress.go     # NEW: User watch progress
│   ├── handlers/
│   │   ├── multimedia_handler.go # UPDATE: Video endpoints
│   │   └── video_upload_handler.go # NEW: Chunked upload, transcoding
│   ├── services/
│   │   ├── video_service.go      # NEW: Video processing logic
│   │   ├── transcoding_service.go # NEW: FFmpeg HLS generation
│   │   ├── thumbnail_service.go  # NEW: Preview generation
│   │   └── redis_service.go      # NEW: Queue management
│   └── workers/
│       └── transcoding_worker.go # NEW: Background job processor

admin/
└── src/app/
    └── multimedia/
        ├── page.tsx              # UPDATE: Video list with status
        ├── upload/
        │   └── page.tsx          # NEW: Video upload form
        └── [id]/
            └── page.tsx          # NEW: Video edit (subtitles, quality)

frontend/
└── components/
    └── media/
        ├── VideoPlayer.tsx       # NEW: HLS player with quality selector
        ├── VideoCard.tsx         # NEW: Video thumbnail card
        └── VideoProgress.tsx     # NEW: Progress tracking
```

---

## 📊 Database Schema (PostgreSQL)

### Новые/Обновлённые таблицы:

```sql
-- Расширение MediaTrack для видео
ALTER TABLE media_tracks ADD COLUMN IF NOT EXISTS
  original_url TEXT,              -- Оригинальный файл в S3
  hls_url TEXT,                   -- Master playlist .m3u8
  transcoding_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  transcoding_progress INT DEFAULT 0,
  file_size BIGINT,
  resolution VARCHAR(20),         -- Исходное разрешение
  has_subtitles BOOL DEFAULT FALSE;

-- Качества видео (360p, 480p, 720p, 1080p)
CREATE TABLE video_qualities (
  id SERIAL PRIMARY KEY,
  media_track_id INT REFERENCES media_tracks(id) ON DELETE CASCADE,
  quality VARCHAR(10) NOT NULL,   -- 360p, 480p, 720p, 1080p
  url TEXT NOT NULL,              -- S3 URL to .m3u8
  bitrate INT,                    -- kbps
  width INT,
  height INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Субтитры
CREATE TABLE video_subtitles (
  id SERIAL PRIMARY KEY,
  media_track_id INT REFERENCES media_tracks(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL,  -- ru, en, hi, etc.
  label VARCHAR(50),              -- "Русский", "English"
  url TEXT NOT NULL,              -- S3 URL to .vtt
  is_default BOOL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Прогресс просмотра
CREATE TABLE user_video_progress (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  media_track_id INT REFERENCES media_tracks(id) ON DELETE CASCADE,
  position INT NOT NULL,          -- Секунды
  duration INT,                   -- Общая длительность
  completed BOOL DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, media_track_id)
);

-- Настройки CDN (Settings table)
INSERT INTO settings (key, value) VALUES 
  ('cdn_enabled', 'false'),
  ('cdn_base_url', 'https://cdn.vedamatch.ru');
```

---

## 🔄 Video Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VIDEO UPLOAD FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Admin]                    [Backend]                    [S3]           │
│     │                          │                          │             │
│     │ 1. Upload Video          │                          │             │
│     │ (chunked, up to 2GB)     │                          │             │
│     ├─────────────────────────>│                          │             │
│     │                          │ 2. Save original         │             │
│     │                          ├─────────────────────────>│             │
│     │                          │                          │             │
│     │                          │ 3. Add to Redis Queue    │             │
│     │                          ├──────┐                   │             │
│     │                          │      │ (transcoding_job) │             │
│     │                          │<─────┘                   │             │
│     │                          │                          │             │
│     │  [Transcoding Worker]    │                          │             │
│     │         │                │                          │             │
│     │         │ 4. FFmpeg HLS  │                          │             │
│     │         │ (360p,480p,    │                          │             │
│     │         │  720p,1080p)   │                          │             │
│     │         │                │                          │             │
│     │         │ 5. Generate    │                          │             │
│     │         │ thumbnails     │                          │             │
│     │         │                │                          │             │
│     │         │ 6. Upload HLS  │                          │             │
│     │         │ segments to S3 ├─────────────────────────>│             │
│     │         │                │                          │             │
│     │         │ 7. Update DB   │                          │             │
│     │         │ (status=done)  │                          │             │
│     │                          │                          │             │
└─────────────────────────────────────────────────────────────────────────┘
```

### FFmpeg HLS Command (пример):

```bash
# Генерация 4 качеств + master playlist
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]split=4[v1][v2][v3][v4]; \
    [v1]scale=w=640:h=360[v360]; \
    [v2]scale=w=854:h=480[v480]; \
    [v3]scale=w=1280:h=720[v720]; \
    [v4]scale=w=1920:h=1080[v1080]" \
  -map "[v360]" -c:v:0 libx264 -b:v:0 800k \
  -map "[v480]" -c:v:1 libx264 -b:v:1 1400k \
  -map "[v720]" -c:v:2 libx264 -b:v:2 2800k \
  -map "[v1080]" -c:v:3 libx264 -b:v:3 5000k \
  -map a:0 -c:a aac -b:a 128k \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0 v:1,a:0 v:2,a:0 v:3,a:0" \
  stream_%v/playlist.m3u8

# Генерация thumbnail
ffmpeg -i input.mp4 -ss 00:00:10 -vframes 1 -q:v 2 thumbnail.jpg
```

---

## 📋 Task Breakdown

### Phase 1: Infrastructure (P0)

| ID | Task | Agent | Skills | Dependencies | Verify |
|----|------|-------|--------|--------------|--------|
| **1.1** | Установить Redis на сервер | `backend-specialist` | server-management | - | `redis-cli ping` → PONG |
| **1.2** | Создать redis_service.go | `backend-specialist` | nodejs-best-practices | 1.1 | Подключение без ошибок |
| **1.3** | Обновить docker-compose.yml (Redis) | `backend-specialist` | deployment-procedures | 1.1 | `docker-compose up` работает |
| **1.4** | Миграция БД (новые таблицы) | `backend-specialist` | database-design | - | Таблицы созданы |

### Phase 2: Backend API (P1)

| ID | Task | Agent | Skills | Dependencies | Verify |
|----|------|-------|--------|--------------|--------|
| **2.1** | Модели: VideoQuality, Subtitle, Progress | `backend-specialist` | database-design | 1.4 | GORM мигрирует без ошибок |
| **2.2** | video_upload_handler.go (chunked upload) | `backend-specialist` | api-patterns | 2.1 | POST /api/admin/video/upload работает |
| **2.3** | transcoding_service.go (FFmpeg интеграция) | `backend-specialist` | clean-code | 2.2 | Генерируется HLS |
| **2.4** | thumbnail_service.go | `backend-specialist` | clean-code | 2.3 | Создаётся превью |
| **2.5** | transcoding_worker.go (Redis очередь) | `backend-specialist` | api-patterns | 2.3, 1.2 | Фоновая обработка работает |
| **2.6** | video_progress_handler.go | `backend-specialist` | api-patterns | 2.1 | GET/POST progress работает |
| **2.7** | subtitle_handler.go (upload VTT) | `backend-specialist` | api-patterns | 2.1 | Субтитры сохраняются |
| **2.8** | CDN toggle в Settings API | `backend-specialist` | api-patterns | - | cdn_enabled переключается |

### Phase 3: Admin Panel (P2)

| ID | Task | Agent | Skills | Dependencies | Verify |
|----|------|-------|--------|--------------|--------|
| **3.1** | Страница загрузки видео | `frontend-specialist` | frontend-design | 2.2 | Форма загружает видео |
| **3.2** | Прогресс транскодирования (real-time) | `frontend-specialist` | frontend-design | 2.5 | Статус обновляется |
| **3.3** | Управление субтитрами | `frontend-specialist` | frontend-design | 2.7 | Upload/delete VTT |
| **3.4** | CDN toggle в Settings | `frontend-specialist` | frontend-design | 2.8 | Переключатель работает |
| **3.5** | Список видео со статусами | `frontend-specialist` | frontend-design | 2.1 | Показывает pending/done |

### Phase 4: Mobile App (P2)

| ID | Task | Agent | Skills | Dependencies | Verify |
|----|------|-------|--------|--------------|--------|
| **4.1** | VideoPlayer.tsx (react-native-video HLS) | `mobile-developer` | mobile-design | 2.3 | HLS воспроизводится |
| **4.2** | Quality selector (ABR manual override) | `mobile-developer` | mobile-design | 4.1 | Можно выбрать качество |
| **4.3** | Subtitle toggle | `mobile-developer` | mobile-design | 4.1, 2.7 | Субтитры отображаются |
| **4.4** | Progress sync (save/resume) | `mobile-developer` | mobile-design | 2.6 | Позиция сохраняется |
| **4.5** | VideoCard.tsx (thumbnail, duration) | `mobile-developer` | mobile-design | 2.4 | Карточка отображается |
| **4.6** | Media section screen | `mobile-developer` | mobile-design | 4.1-4.5 | Полный раздел работает |

### Phase 5: Testing & Optimization (P3)

| ID | Task | Agent | Skills | Dependencies | Verify |
|----|------|-------|--------|--------------|--------|
| **5.1** | Unit tests: transcoding_service | `backend-specialist` | testing-patterns | 2.3 | `go test` pass |
| **5.2** | Integration tests: upload flow | `backend-specialist` | testing-patterns | 2.1-2.5 | Full flow works |
| **5.3** | Mobile E2E: video playback | `mobile-developer` | webapp-testing | 4.1-4.6 | Detox/manual pass |
| **5.4** | Performance: large file upload | `backend-specialist` | performance-profiling | 2.2 | 2GB uploads OK |
| **5.5** | Security audit | `security-auditor` | vulnerability-scanner | All | No critical issues |

---

## 🔐 Security Considerations

| Риск | Митигация |
|------|-----------|
| Неавторизованная загрузка | JWT + Admin role check |
| Большие файлы (DoS) | Лимит 2GB, chunked upload |
| Malware в видео | FFmpeg валидация формата |
| Прямой доступ к S3 | Signed URLs с TTL |
| Brute force | Rate limiting (Redis) |

---

## 📈 Rollback Strategy

| Компонент | Откат |
|-----------|-------|
| Redis | Возврат к in-memory очередям |
| HLS | Fallback на прямые MP4 ссылки |
| CDN | Отключение в Settings |
| Новые таблицы | SQL миграция down |

---

## 🎯 Milestones

| Milestone | Задачи | Результат |
|-----------|--------|-----------|
| **M1** | 1.1-1.4 | Redis + DB готовы |
| **M2** | 2.1-2.5 | Видео загружается и транскодируется |
| **M3** | 3.1-3.5 | Админка полностью функциональна |
| **M4** | 4.1-4.6 | Мобильное приложение воспроизводит видео |
| **M5** | 5.1-5.5 | Тесты пройдены, готово к production |

---

## Phase X: Verification Checklist

```bash
# P0: Lint & Type Check
cd server && go vet ./...
cd admin && npm run lint

# P0: Security Scan
python .agent/skills/vulnerability-scanner/scripts/security_scan.py .

# P1: Unit Tests
cd server && go test ./internal/services/...

# P2: Integration Tests
# Manual: Upload video → Wait transcoding → Play HLS

# P3: Performance
# Upload 2GB video, measure time

# P4: Mobile Test
# Play HLS on iOS + Android
```

### Rule Compliance
- [ ] No purple/violet hex codes
- [ ] No standard template layouts
- [ ] Socratic Gate was respected ✅

---

## 📚 References

- [FFmpeg HLS Documentation](https://ffmpeg.org/ffmpeg-formats.html#hls-2)
- [react-native-video](https://github.com/react-native-video/react-native-video)
- [Redis Queues in Go](https://github.com/hibiken/asynq)
- [S3 Multipart Upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)

---

> **Следующий шаг:** Запустите `/create` для начала имплементации или отредактируйте план вручную.
