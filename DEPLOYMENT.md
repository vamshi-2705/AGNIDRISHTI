# AGNIDRISHTI — Production Deployment & Container Guide
Smart India Hackathon (SIH 2026) | Problem Statement 26162 (NTRO)

## 1. Prerequisites
- Docker 24.0+ and Docker Compose v2.20+
- Access to an external PostgreSQL 16/17 instance with PostGIS 3.x (e.g., Neon Serverless PostgreSQL)
- NASA FIRMS Map Key (from https://firms.modaps.eosdis.nasa.gov/api/map_key/)
- Optional: Cesium Ion Token (for 3D photorealistic tiles)

---

## 2. Architecture Overview
```
[ Browser / GIS Client ]
         │
         ▼
[ Frontend Container (Nginx Alpine) ] ── (Static React SPA assets, Port 5173 / 80)
         │
         ▼ (REST API calls via VITE_API_BASE_URL)
[ Backend Container (FastAPI / Uvicorn) ] ── (Python 3.10-slim, Port 8000)
    │           │
    │           └── [ Background APScheduler ] ── (NASA FIRMS VIIRS feeds)
    │
    ▼ (PostgreSQL Connection Pooling + Advisory Locking)
[ External Neon PostgreSQL + PostGIS ] (1,172+ events, 3,588+ observations)
```

- **Database Separation**: PostgreSQL + PostGIS is **not** inside Docker. Neon remains the managed cloud database.
- **No Redis / No Celery**: In-memory rate limiting and embedded APScheduler with PostgreSQL advisory locks provide single-process concurrency without extra message brokers.

---

## 3. Environment Variables Matrix

### Backend Variables (Runtime)
| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | *(Required)* | Connection URI for Neon PostgreSQL (`postgresql+psycopg://...`) |
| `NASA_FIRMS_MAP_KEY` | *(Required for live)* | NASA FIRMS Map Key for thermal anomaly downloads |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173` | Allowed CORS origins (comma-separated) |
| `ENVIRONMENT` | `production` | Environment mode (`development` or `production`) |
| `DEBUG` | `false` | Debug mode toggle |
| `BACKEND_PORT` | `8000` | Host port to expose |
| `INGESTION_ENABLED` | `true` | Background scheduler toggle |
| `INGESTION_INTERVAL_SECONDS` | `300` | Scheduling period (5 minutes) |
| `RATE_LIMIT_ENABLED` | `true` | API rate-limiting toggle |
| `RATE_LIMIT_DEFAULT` | `120` | General endpoint rate limit (req/min) |
| `RATE_LIMIT_SENSITIVE` | `30` | Heavy compute endpoint rate limit (req/min) |

### Frontend Variables (Build-Time)
| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API URL accessible from user browser |
| `VITE_CESIUM_ION_TOKEN` | *(Optional)* | Cesium Ion access token for 3D terrain |
| `VITE_GOOGLE_MAPS_API_KEY`| *(Optional)* | Google Maps / Photorealistic 3D Tiles key |

---

## 4. Local Container Startup

### Step 1: Prepare `.env`
Ensure `.env` in the repository root (or `backend/.env`) contains your valid configuration:
```bash
cp .env.example .env
# Edit .env with your actual DATABASE_URL and NASA_FIRMS_MAP_KEY
```

### Step 2: Build and Launch Containers
```bash
docker compose build
docker compose up -d
```

### Step 3: Verify Status
```bash
docker compose ps
```
Both containers will report `(healthy)` within 15–20 seconds.

### Step 4: Access Application
- **Frontend Web UI**: http://localhost:5173
- **Backend API Docs**: http://localhost:8000/docs
- **Backend Healthcheck**: http://localhost:8000/health

---

## 5. Health Checks & Telemetry

### Lightweight Liveness Check
```bash
curl http://localhost:8000/health
```
Returns:
```json
{
  "status": "healthy",
  "service": "agnidrishti-backend",
  "timestamp_utc": "2026-09-17T18:30:00Z"
}
```

### Background Ingestion & Scheduler Health
```bash
curl http://localhost:8000/api/ingestion-health
```
Reports active scheduler status, advisory lock status, and last sync timestamp.

### Database Health
```bash
curl http://localhost:8000/api/data-health
```
Reports active database backend (`PostgreSQL 17 + PostGIS 3.5`), row counts, and storage engine telemetry.

---

## 6. Managing Containers

### Viewing Logs
```bash
# View backend logs (including scheduler and FIRMS synchronization)
docker compose logs -f backend

# View frontend access logs
docker compose logs -f frontend
```

### Stopping and Restarting
```bash
# Stop containers gracefully
docker compose stop

# Start stopped containers
docker compose start

# Tear down containers
docker compose down
```

---

## 7. Background Ingestion & Advisory Locking Behavior
1. **Startup**: When the backend container starts, the FastAPI lifespan initializes APScheduler and runs an initial non-blocking cycle in a background thread.
2. **Mutual Exclusion**: Before querying NASA FIRMS, the worker executes `SELECT pg_try_advisory_lock(26162101);` against Neon. If multiple container replicas run, only one replica executes ingestion.
3. **Graceful Fallback**: If NASA FIRMS experiences an outage or returns 503, existing records in PostgreSQL are preserved untouched.
4. **Non-Blocking APIs**: `/api/fires` serves cached snapshots instantly (<50ms) and never blocks waiting for satellite downloads.

---

## 8. Demo Isolation vs. Platform Surveillance
- `/platform`: Strictly data-driven from authentic NASA FIRMS VIIRS detections, PostGIS spatial queries, and live meteorological feeds.
- `/demo`: Controlled scenario mode using simulated mock alerts clearly marked with `AGNI-DEMO-*` prefixes. Demo scenarios do not write to or contaminate the Neon production database.
