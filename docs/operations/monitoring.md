# İzleme ve Gözlemleme Kılavuzu

## Genel Bakış

XCord platformunun sağlığını, performansını ve güvenilirliğini sürekli olarak izlemek için kapsamlı bir izleme ve gözlemleme stratejisi uygulanmaktadır.

## İzleme Bileşenleri

### 1. Sistem Metrikleri

#### Sunucu Metrikleri
- CPU kullanımı
- Bellek kullanımı
- Disk I/O
- Ağ trafiği
- Yük ortalaması

```yaml
# Prometheus yapılandırması
scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      - targets: ['localhost:9100']
    metrics_path: /metrics
    scrape_interval: 15s
```

#### Uygulama Metrikleri
- İstek sayısı
- Yanıt süreleri
- Hata oranları
- Aktif kullanıcı sayısı
- WebSocket bağlantı sayısı

```javascript
// Prometheus metrik tanımlamaları
const metrics = {
  requestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP isteği süre dağılımı',
    labelNames: ['method', 'path', 'status']
  }),

  wsConnections: new Gauge({
    name: 'websocket_connections_total',
    help: 'Aktif WebSocket bağlantı sayısı'
  }),

  messageRate: new Counter({
    name: 'messages_processed_total',
    help: 'İşlenen toplam mesaj sayısı'
  })
};
```

### 2. Loglama

#### Log Seviyeleri
- ERROR: Kritik hatalar
- WARN: Potansiyel sorunlar
- INFO: Genel bilgi mesajları
- DEBUG: Detaylı debug bilgileri

```javascript
// Winston logger yapılandırması
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'xcord-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});
```

#### Log Toplama
- Elasticsearch
- Logstash
- Kibana (ELK Stack)

```yaml
# Logstash yapılandırması
input {
  beats {
    port => 5044
  }
}

filter {
  json {
    source => "message"
  }
  
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "xcord-logs-%{+YYYY.MM.dd}"
  }
}
```

### 3. Tracing

#### Distributed Tracing
- Jaeger
- OpenTelemetry

```javascript
// Jaeger yapılandırması
const tracer = initJaegerTracer({
  serviceName: 'xcord-service',
  sampler: {
    type: 'const',
    param: 1
  },
  reporter: {
    logSpans: true,
    agentHost: 'jaeger-agent',
    agentPort: 6832
  }
});
```

### 4. Uyarılar (Alerting)

#### Uyarı Kuralları

```yaml
# Prometheus Alert Rules
groups:
- name: xcord_alerts
  rules:
  - alert: HighCpuUsage
    expr: avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      description: "CPU kullanımı 5 dakikadır %80'in üzerinde"

  - alert: HighMemoryUsage
    expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100 < 20
    for: 5m
    labels:
      severity: warning
    annotations:
      description: "Kullanılabilir bellek %20'nin altında"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      description: "Hata oranı %5'in üzerinde"
```

#### Bildirim Kanalları
- Email
- Slack
- PagerDuty
- SMS

```yaml
# Alertmanager yapılandırması
receivers:
- name: 'team-slack'
  slack_configs:
  - channel: '#alerts'
    api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
    title: '{{ template "slack.default.title" . }}'
    text: '{{ template "slack.default.text" . }}'
    send_resolved: true
```

## Görselleştirme

### 1. Grafana Dashboards

#### Sistem Metrikleri Dashboard'u
```json
{
  "dashboard": {
    "title": "XCord System Metrics",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "graph",
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 0
        },
        "targets": [
          {
            "expr": "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
          }
        ]
      }
    ]
  }
}
```

#### Uygulama Metrikleri Dashboard'u
```json
{
  "dashboard": {
    "title": "XCord Application Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_bucket[5m])"
          }
        ]
      }
    ]
  }
}
```

## Performans İzleme

### 1. API Performans Metrikleri

```typescript
interface ApiMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
}

// API metriklerini topla
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.requestDuration
      .labels(req.method, req.path, res.statusCode.toString())
      .observe(duration / 1000);
  });
  next();
});
```

### 2. Database Performans İzleme

```sql
-- PostgreSQL query performans izleme
SELECT 
  schemaname,
  relname,
  seq_scan,
  idx_scan,
  n_live_tup,
  n_dead_tup
FROM 
  pg_stat_user_tables
ORDER BY 
  n_live_tup DESC;
```

### 3. Cache Performans İzleme

```javascript
// Redis metrikler
const redisMetrics = {
  hits: new Counter({
    name: 'cache_hits_total',
    help: 'Cache isabet sayısı'
  }),
  
  misses: new Counter({
    name: 'cache_misses_total',
    help: 'Cache kaçırma sayısı'
  }),
  
  latency: new Histogram({
    name: 'cache_operation_duration_seconds',
    help: 'Cache operasyon süreleri'
  })
};
```

## Kapasite Planlama

### 1. Kaynak Kullanım Tahminleri

```sql
-- Veritabanı büyüme analizi
SELECT
  schemaname,
  relname,
  pg_size_pretty(pg_total_relation_size(relid)) as size,
  pg_size_pretty(pg_relation_size(relid)) as table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### 2. Ölçeklendirme Metrikleri

```yaml
# Kubernetes HPA yapılandırması
apiVersion: autoscaling/v2beta2
kind: HorizontalPodAutoscaler
metadata:
  name: xcord-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: xcord-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Sorun Giderme

### 1. Log Analizi

```bash
# Elasticsearch sorguları
GET xcord-logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "level": "error" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "sort": [
    { "@timestamp": { "order": "desc" } }
  ]
}
```

### 2. Performans Analizi

```bash
# Node.js CPU profili
node --prof app.js

# Profil analizi
node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > processed.txt
```

### 3. Network Analizi

```bash
# TCP bağlantı durumu
netstat -an | grep ESTABLISHED | wc -l

# Network gecikmesi
ping api.xcord.app