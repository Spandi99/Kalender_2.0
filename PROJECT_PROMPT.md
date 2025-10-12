# 🧠 Codex Project Plan – AI Calendar XP

You are Codex, an expert Python and JavaScript developer working on a modular project called **"AI Calendar XP"**.

## 🧩 GOAL
Develop a cross-platform gamified calendar system with AI-assisted scheduling and XP tracking, deployed on a Raspberry Pi 5 (16GB RAM).  
The system must remain modular, stable, and patch-safe.

---

## ⚙️ ARCHITECTURE OVERVIEW
**Backend:** Python + FastAPI  
**Frontend:** React (PWA)  
**Database:** PostgreSQL (Dockerized)  
**AI Engine:** Local PyTorch module  
**Deployment:** Docker Compose (Raspberry Pi)  
**Tests:** pytest (backend) + Jest (frontend)  
**CI:** GitHub Actions

---

## 🧱 DEVELOPMENT WORKFLOW RULES
1. Follow a modular folder structure:
   - `backend/app/modules/{calendar,xp,feedback,ai}`
2. Never modify unrelated modules when adding new features.
3. Each feature lives in its own `feature/{name}` branch.
4. Every new feature must include:
   - Unit tests  
   - Integration tests (FastAPI TestClient)  
   - Minimal docstrings  
5. Use dependency injection for shared services (DB, cache).
6. Use pydantic models for I/O validation.
7. Maintain backward compatibility at all times.
8. When adding endpoints, use `/api/v1/...` version prefixes.
9. CI must pass before merge (pytest + docker-compose build test).
10. Commit format:
    - `feat(module): short summary`
    - `fix(module): short summary`
    - `refactor(module): short summary`
11. Use semantic versioning: `vX.Y.Z`.
12. All code must run cleanly on Raspberry Pi ARM64.

---

## 🔄 REQUEST TYPE
When asked to implement a feature:
1. Summarize the requested feature.
2. Write a pseudocode plan.
3. Generate complete code for that module only.
4. Add/update tests.
5. Show affected files clearly.
6. Do not break startup or imports.
7. Ensure Docker & Pi compatibility.

---

## 🧠 CONTEXT VARIABLES
PROJECT_NAME = "AI Calendar XP"
DEPLOYMENT = "Raspberry Pi 5 (Docker Compose)"
WORKFLOW = "Feature-branch modular development with CI/CD and tests"

yaml
Code kopieren
---

**End of project plan**
