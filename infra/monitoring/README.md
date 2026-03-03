# Vedamatch Production Observability

Production monitoring and logging stack for Vedamatch:

- Grafana
- Prometheus
- Loki (TSDB + S3)
- Promtail
- node-exporter
- cAdvisor
- blackbox-exporter

## What is monitored

- Host metrics (CPU, memory, disk, load)
- Container metrics (runtime + resource usage)
- API service metrics from `GET /metrics` with Bearer token
- Container logs (`vedamatch-*` + `dokploy-traefik`)
- System journal logs (selected critical units)
- External probes:
  - `https://api.vedamatch.ru/api/news`
  - `https://lkm.vedamatch.ru`
  - `https://livekit.vedamatch.ru`

## Retention defaults

- Prometheus: `30d` retention time
- Loki: `30d` retention via compactor

## Promtail lifecycle note

Promtail is deprecated and EOL is March 2, 2026. This stack keeps Promtail for immediate compatibility. Plan a migration to Grafana Alloy in the next observability iteration.

## Local validation

```bash
cd infra/monitoring
docker compose -f docker-compose.monitoring.prod.yml config
```

## Production deployment (SSH)

1. Copy monitoring directory to server:

```bash
scp -r infra/monitoring root@45.150.9.229:/opt/vedamatch-observability
```

2. On server, prepare secrets:

```bash
cp /opt/vedamatch-observability/monitoring/.env.monitoring.example /opt/vedamatch-observability/monitoring/.env.monitoring
# fill real values in .env.monitoring

# set real metrics token file (same token as METRICS_BEARER_TOKEN in backend)
echo "your-metrics-token" > /opt/vedamatch-observability/monitoring/prometheus/secrets/metrics_bearer_token
chmod 600 /opt/vedamatch-observability/monitoring/prometheus/secrets/metrics_bearer_token
```

3. Start stack:

```bash
cd /opt/vedamatch-observability/monitoring
docker compose --env-file .env.monitoring -f docker-compose.monitoring.prod.yml up -d
```

4. Access Grafana privately:

```bash
ssh -L 13000:127.0.0.1:13000 root@45.150.9.229
```

Then open `http://127.0.0.1:13000`.

## Smoke checks

```bash
docker compose -f docker-compose.monitoring.prod.yml ps
curl -s http://127.0.0.1:19090/-/ready
curl -s -H "Authorization: Bearer <token>" https://api.vedamatch.ru/metrics | head
```

In Prometheus UI (`/targets`) all core jobs should be `UP`.
