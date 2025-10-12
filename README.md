# AI Calendar XP v0.1.0

AI Calendar XP is a modular, gamified, AI-assisted calendar system designed to run locally on a Raspberry Pi 5 using Docker Compose. This repository provides the production-ready bootstrap for both backend and frontend services, complete with CI and container orchestration.

## Project Layout

```
calendar-xp-ai/
├── backend/            # FastAPI + SQLAlchemy backend
├── frontend/           # Vite + React + Tailwind frontend
├── docker-compose.yml  # Multi-service orchestration (backend, frontend, PostgreSQL)
└── .github/workflows   # Continuous integration pipelines
```

### Backend
- FastAPI application with modular routers (`calendar`, `xp`, `feedback`, `ai`).
- Async PostgreSQL integration via SQLAlchemy + asyncpg.
- Pytest smoke tests ensure API startup and health endpoint correctness.
- Dockerfile targets Python 3.11 slim images with ARM64-friendly packages.

### Frontend
- React 18 + Vite + TypeScript PWA scaffold.
- Tailwind CSS with ShadCN-inspired UI primitives and Radix UI dialogs.
- FullCalendar integration for scheduling, Recharts for analytics, Axios API client.
- Jest + Testing Library smoke test for the main dashboard render.
- Dockerfile builds static assets and serves them through nginx.
- PWA icons are intentionally omitted so that only text-based assets are tracked; place your PNG icons under
  `frontend/web/public/icons/` before building for distribution.

### DevOps
- `docker-compose.yml` spins up PostgreSQL, backend, and frontend services with the correct environment variables.
- GitHub Actions workflow runs backend pytest suite, frontend Jest suite, and builds Docker images on every push/PR.

## Getting Started

### Local Development
1. **Backend**
   ```bash
   cd calendar-xp-ai/backend
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

2. **Frontend**
   ```bash
   cd calendar-xp-ai/frontend/web
   npm install
   npm run dev
   ```

### Docker Compose
```bash
cd calendar-xp-ai
docker-compose up --build
```
This starts PostgreSQL on port `5432`, the FastAPI backend on `8000`, and the nginx-served frontend on `3000`.

### Running Tests
- Backend: `pytest` from `calendar-xp-ai/backend`
- Frontend: `npm test -- --runInBand` from `calendar-xp-ai/frontend/web`

## Versioning
Project versioning follows semantic versioning. This bootstrap release is tagged as **v0.1.0**.

## License
This project is provided as-is for internal development of AI Calendar XP.
