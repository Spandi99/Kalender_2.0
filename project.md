## Patch 14 – Stable HTTPS Deployment & Self-Healing
This patch introduces a fully reliable HTTPS setup for orgalifer.ch, including:
- Nginx hardening & automatic dummy certificate fallback
- Working Certbot renewal
- Correct proxy pass from frontend to backend
- Mobile access compatibility (IPv6-ready)
- Self-healing monitor for backend and nginx
## 🔒 Permanent Infrastructure Rules (Do Not Modify)

- The `.env` file is always mounted from the project root (`./.env`) into the backend container.  
- Postgres runs with user UID:GID `999:999` to avoid permission issues on volume `./postgres_data`.  
- No changes to `docker-compose.yml` or `backend/Dockerfile` related to env mounts, ports, or volumes are permitted.
- The `scripts/health_monitor.sh` must remain active for backend self-healing.
- Codex or automation tools must **not regenerate** or remove `.env` mount configurations or volume ownership.
