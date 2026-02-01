# 🔴 Redis Setup in Dokploy

> Инструкция по установке Redis на продакшен сервере через Dokploy

---

## 📋 Требования

- Dokploy установлен и работает
- Доступ к панели Dokploy (обычно `https://your-server:3000`)
- SSH доступ к серверу (опционально)

---

## 🚀 Способ 1: Через UI Dokploy (Рекомендуется)

### Шаг 1: Создать новый сервис

1. Откройте **Dokploy Dashboard**
2. Перейдите в ваш **Project** (или создайте новый)
3. Нажмите **"+ Add Service"**
4. Выберите **"Database"** или **"Docker"**

### Шаг 2: Настройка Redis

**Если выбрали "Database":**
- Выберите **Redis** из списка
- Dokploy автоматически настроит всё

**Если выбрали "Docker":**
- **Image**: `redis:7-alpine`
- **Container Name**: `redis`
- **Port**: `6379`

### Шаг 3: Конфигурация

В разделе **Environment Variables** добавьте (опционально):

```env
# Если нужен пароль (рекомендуется для продакшена)
REDIS_PASSWORD=your_secure_password_here
```

В разделе **Docker Command** (если нужен пароль):

```
redis-server --requirepass your_secure_password_here --appendonly yes
```

### Шаг 4: Persistent Storage (Важно!)

В разделе **Volumes** добавьте:

| Host Path | Container Path | Description |
|-----------|----------------|-------------|
| `/data/redis` | `/data` | Persistent storage |

### Шаг 5: Network

Убедитесь что Redis в той же **Docker Network** что и ваш Go backend:
- Обычно это `dokploy-network` или network вашего проекта

### Шаг 6: Deploy

1. Нажмите **"Deploy"**
2. Дождитесь статуса **"Running"**
3. Проверьте логи на отсутствие ошибок

---

## 🚀 Способ 2: Через docker-compose (Альтернатива)

Если вы используете `docker-compose.prod.yml`, добавьте Redis:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Ваши существующие сервисы...
  
  redis:
    image: redis:7-alpine
    container_name: vedamatch-redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    ports:
      - "6379:6379"  # Убрать если не нужен внешний доступ
    volumes:
      - redis_data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:

networks:
  app-network:
    external: true
```

Затем в Dokploy загрузите обновлённый docker-compose.

---

## 🔧 Способ 3: SSH + Docker напрямую

```bash
# SSH на сервер
ssh root@your-server-ip

# Создать директорию для данных
mkdir -p /data/redis

# Запустить Redis
docker run -d \
  --name vedamatch-redis \
  --restart always \
  --network dokploy-network \
  -p 6379:6379 \
  -v /data/redis:/data \
  redis:7-alpine \
  redis-server --requirepass YOUR_SECURE_PASSWORD --appendonly yes

# Проверить статус
docker ps | grep redis

# Проверить подключение
docker exec -it vedamatch-redis redis-cli -a YOUR_SECURE_PASSWORD ping
# Должен вернуть: PONG
```

---

## ⚙️ Настройка Backend (.env)

После установки Redis, обновите `.env` вашего Go сервера:

```env
# Redis Configuration
REDIS_HOST=redis          # Имя контейнера если в той же сети
# или
REDIS_HOST=localhost      # Если Redis на том же сервере
# или  
REDIS_HOST=172.17.0.1     # Docker gateway IP

REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password_here
REDIS_DB=0
```

**Для Dokploy internal network:**
- Используйте имя контейнера: `REDIS_HOST=vedamatch-redis`
- Или имя сервиса из docker-compose: `REDIS_HOST=redis`

---

## 🔒 Security Best Practices

### 1. Пароль обязателен
```bash
redis-server --requirepass StrongPassword123!
```

### 2. Не открывайте порт наружу
Уберите `ports` из docker-compose если Redis нужен только внутренним сервисам:
```yaml
# НЕ делайте так в продакшене:
# ports:
#   - "6379:6379"  # Открыто для всего интернета!
```

### 3. Используйте Docker Network
```yaml
networks:
  - dokploy-network  # Внутренняя сеть
```

### 4. Memory Limit
```yaml
deploy:
  resources:
    limits:
      memory: 512M
```

---

## ✅ Проверка работы

### 1. Из контейнера backend:

```bash
# Зайти в контейнер Go сервера
docker exec -it vedamatch-server sh

# Проверить доступ к Redis
nc -zv redis 6379
# Connection to redis 6379 port [tcp/*] succeeded!
```

### 2. Через redis-cli:

```bash
docker exec -it vedamatch-redis redis-cli -a YOUR_PASSWORD

# Команды для проверки:
> PING
PONG

> SET test "hello"
OK

> GET test
"hello"

> INFO server
# Информация о сервере
```

### 3. Из Go кода (после добавления redis_service.go):

```go
// Тест подключения
rdb := redis.NewClient(&redis.Options{
    Addr:     "redis:6379",
    Password: os.Getenv("REDIS_PASSWORD"),
    DB:       0,
})

_, err := rdb.Ping(context.Background()).Result()
if err != nil {
    log.Fatal("Redis connection failed:", err)
}
log.Println("✅ Redis connected!")
```

---

## 🔄 Backup & Restore

### Backup:
```bash
# Redis автоматически сохраняет в /data/dump.rdb
docker exec vedamatch-redis redis-cli -a PASSWORD BGSAVE

# Скопировать backup
docker cp vedamatch-redis:/data/dump.rdb ./backup-$(date +%Y%m%d).rdb
```

### Restore:
```bash
# Остановить Redis
docker stop vedamatch-redis

# Заменить dump.rdb
docker cp ./backup.rdb vedamatch-redis:/data/dump.rdb

# Запустить Redis
docker start vedamatch-redis
```

---

## 🐛 Troubleshooting

| Проблема | Решение |
|----------|---------|
| `NOAUTH` error | Добавьте `-a PASSWORD` к командам |
| `Connection refused` | Проверьте что Redis в той же Docker network |
| `OOM` (Out of Memory) | Увеличьте лимит памяти или настройте maxmemory |
| Данные пропали | Проверьте volume mounting |

### Проверка сети:
```bash
# Найти IP Redis в Docker network
docker inspect vedamatch-redis | grep IPAddress

# Проверить network
docker network inspect dokploy-network
```

---

## 📊 Рекомендуемые настройки для продакшена

```bash
redis-server \
  --requirepass YOUR_PASSWORD \
  --appendonly yes \
  --maxmemory 256mb \
  --maxmemory-policy allkeys-lru \
  --tcp-keepalive 300
```

| Параметр | Значение | Описание |
|----------|----------|----------|
| `appendonly` | yes | Персистентность данных |
| `maxmemory` | 256mb-512mb | Лимит памяти |
| `maxmemory-policy` | allkeys-lru | Удалять старые ключи при переполнении |
| `tcp-keepalive` | 300 | Keep-alive для соединений |

---

> **Готово!** После установки Redis переходите к имплементации `redis_service.go` в Go backend.
