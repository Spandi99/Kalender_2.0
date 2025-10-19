# AI Calendar XP

A minimal, container-friendly calendar and XP tracking application optimized for Raspberry Pi 5 (16 GB RAM). The project ships with a FastAPI backend, a Vite + React frontend using ShadCN UI primitives, Docker Compose orchestration, and GitHub Actions CI.

## Features
- 📅 **Calendar management** with FullCalendar (month & week views)
- ⭐ **XP tracking** with automatic rewards per event category and Recharts visualization
- 💬 **Feedback collection** dialog with mood tracking and difficulty ratings
- 🧱 **Two-panel layout** (calendar + analytics) using ShadCN-inspired components
- 🧪 **Automated tests** (`pytest` for backend, `vitest` for frontend)
- 🐳 **Docker Compose** stack for PostgreSQL, backend, and frontend services

## Project Structure
```
calendar-xp-ai/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── modules/{calendar,xp,feedback}/
│   │   └── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   └── api/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .github/workflows/test.yml
└── README.md
```

## Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

## Local Development
### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev -- --host
```
Set the Vite environment variable `VITE_API_URL` to point to the backend API (defaults to `http://localhost:8000/api/v1`).

## Docker Compose
```bash
docker compose up --build
```
Services:
- `frontend` → http://localhost:5173
- `backend` → http://localhost:8000
- `db` → PostgreSQL on port 5432 (user/password: `calendar`)

## Testing
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test -- --run
```

## Continuous Integration
GitHub Actions workflow (`.github/workflows/test.yml`) installs dependencies and runs unit tests for both the backend and frontend on every push and pull request.

## Environment Variables
| Service   | Variable        | Default Value                                     |
|-----------|-----------------|---------------------------------------------------|
| Backend   | `DATABASE_URL`  | `sqlite:///./calendar.db` (local) / Postgres in CI |
| Frontend  | `VITE_API_URL`  | `http://localhost:8000/api/v1`                     |

## Raspberry Pi Notes
- Docker images are based on `python:3.11-slim` and `node:20-slim`, both supporting ARM64.
- Postgres uses the `postgres:16-alpine` image, compatible with Raspberry Pi 5.

## Cloudflare Tunnel
The Docker Compose stack now starts Cloudflare Tunnel alongside nginx, so one command brings the entire system online:

```bash
# start or update the whole stack (db, backend, frontend, nginx, certbot, cloudflared)
docker compose up -d
```

Key details:
- The Cloudflare volume `/home/spandi/.cloudflared` must contain `config.yml`, the tunnel credentials JSON, and the Cloudflare origin `cert.pem`/`cert.key` pair.
- `nginx/docker-entrypoint.d/10-generate-cert.sh` copies the origin certificate into `/etc/letsencrypt/live/orgalifer.ch/` on every start, so nginx always serves the right TLS chain.
- `cloudflared` reads the same directory and routes both `orgalifer.ch` and `api.orgalifer.ch` to `https://kalender-nginx:443` using HTTP/2.

Common operations:
- Apply config changes (e.g., new origin certificate) by updating the files under `/home/spandi/.cloudflared` and running `docker compose up -d nginx cloudflared`.
- Check tunnel health with `docker logs cloudflared --tail 20` or `curl https://orgalifer.ch/api/health`.

Optional hardening:
- Drop the Cloudflare Origin CA root certificate into `/home/spandi/.cloudflared` and set `noTLSVerify: false` in `config.yml` once you are ready to enforce full verification.
