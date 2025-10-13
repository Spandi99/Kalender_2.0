Sehr stark 🔥 — genau das ist der Move, der dein Projekt jetzt **von Chaos zu Momentum** bringt.
Wir bauen also eine **ROADMAP.md**, die:

* dein gesamtes Kalender-AI-XP-Projekt strukturiert,
* alle Schritte für Codex beschreibt (inklusive fertiger Prompts),
* die logische Reihenfolge enthält (stabil → Feature → AI),
* und sauber versioniert werden kann (v0.1 – v1.0+).

Hier ist der vollständige Vorschlag 👇

---

## 📘 **ROADMAP.md**

```markdown
# 🗓️ AI Calendar XP — Development Roadmap

> Intelligent calendar system with XP-based motivation, auto-scheduling AI, and seamless multi-device sync.  
> Built for Raspberry Pi (self-hosted, privacy-first).

---

## 🚀 Project Vision

AI Calendar XP is a personal productivity and gamified calendar assistant that:
- Syncs events (local + ical)
- Tracks progress and habits with an XP system
- Learns from behavior to optimize future schedules
- Provides insights (focus, health, balance)

---

## ⚙️ Technical Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React (Vite) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| ML Engine | Local training (scikit-learn / PyTorch-lite) |
| Deployment | Docker Compose (Raspberry Pi 5) |

---

## 📍 Phase 1 — Stabilization (v0.1)

**Goal:** Ensure backend, frontend, and DB communicate correctly.

✅ Tasks:
- [ ] Fix backend entrypoint (FastAPI loads correctly)
- [ ] Ensure `/health` endpoint returns `{ "status": "ok" }`
- [ ] CORS headers work for frontend at `http://192.168.1.136:8080`
- [ ] Database accessible via SQLAlchemy
- [ ] Docker Compose starts all services without error

**Codex Prompt:**
```

# Fix FastAPI Backend (Raspberry Pi / Docker Compose Environment)

Ensure FastAPI backend runs on port 8000 and responds correctly to frontend requests.
Enable CORS for origins [http://localhost:8080](http://localhost:8080) and [http://192.168.1.136:8080](http://192.168.1.132:8080).
Add /health and /api/events endpoints that connect to PostgreSQL.
Verify startup inside Docker Compose (Raspberry Pi ARM64).

```

---

## 🧩 Phase 2 — Event Persistence (v0.2)

**Goal:** Enable CRUD for events and persist data in PostgreSQL.

✅ Tasks:
- [ ] Add `/api/events` (GET/POST/PUT/DELETE)
- [ ] Frontend `Add Event` button creates events
- [ ] Events survive reload (saved in DB)
- [ ] Implement categories (Study, Workout, Meeting)
- [ ] Include simple `completed` flag

**Codex Prompt:**
```

Implement persistent event CRUD in FastAPI.
Ensure frontend can create/edit/delete events.
Persist events in PostgreSQL and reload them on frontend load.
Add 'category' and 'completed' fields.

```

---

## 💫 Phase 3 — XP System (v0.3)

**Goal:** Gamify productivity.

✅ Tasks:
- [ ] XP points for completed events
- [ ] Stats by category (Focus, Athletic, Creativity, etc.)
- [ ] `/api/xp` and `/api/feedback` endpoints
- [ ] Frontend dashboard to show XP totals
- [ ] Add simple avatar / progress bar

**Codex Prompt:**
```

Implement XP tracking:

* XP += category_weight when event.completed == True
* Track XP per category and store in DB
* Add /api/xp/stats endpoint returning JSON summary
* Build XP stats dashboard in frontend (progress bars or chart)

```

---

## 🧠 Phase 4 — AI Planning Assistant (v0.4)

**Goal:** Create a smart planner that learns from user patterns.

✅ Tasks:
- [ ] Collect feedback after each event (how did it go?)
- [ ] Store performance and delay metrics
- [ ] Implement suggestion system (auto reschedule, rest prompts)
- [ ] Train a lightweight ML model locally on the Pi
- [ ] Suggest “ideal day” templates based on past data

**Codex Prompt:**
```

Implement local AI planner:

* Collect feedback and timing data for events
* Train lightweight ML model (sklearn or TensorFlow Lite)
* Generate daily plan suggestions
* Adjust standard-day templates around fixed events

```

---

## 🧠 Phase 5 — UI Revamp (v0.5)

**Goal:** Modern, intuitive interface.

✅ Tasks:
- [ ] Use shadcn/ui or Mantine components
- [ ] Add XP dashboard
- [ ] Event creation modal (drag & drop)
- [ ] Category-based color coding
- [ ] "Standard Day Template" UI editor

**Codex Prompt:**
```

Rebuild UI with Mantine or shadcn/ui.
Add XP dashboard and improved calendar layout.
Implement "Standard Day Template" editor.
Ensure responsive design for desktop and mobile.

```

---

## 🧰 Phase 6 — Sync & AI Feedback Loop (v1.0)

**Goal:** Complete ecosystem.

✅ Tasks:
- [ ] Sync ical imports
- [ ] Device sync (PC <-> iPhone)
- [ ] Train local AI model weekly
- [ ] Suggest rest periods, habit improvements
- [ ] Add profile summary & XP achievements

**Codex Prompt:**
```

Add sync + AI feedback:

* ical import/export
* background sync between devices
* weekly retraining of local AI
* suggestions for balance and rest
* achievements panel in frontend

```

---

## 📊 Versioning Plan

| Version | Focus |
|----------|--------|
| v0.1 | Infrastructure / CORS fix |
| v0.2 | CRUD + Persistent Events |
| v0.3 | XP Gamification |
| v0.4 | AI Planner |
| v0.5 | Modern UI |
| v1.0 | Sync + Intelligent Feedback |

---

## 🧱 Workflow Summary

1. All Codex work → `dev` branch  
2. Codex creates PR → automatic Docker build test  
3. Merge only when build passes  
4. Tag each stable version  
5. Always test `/health` and `/api/events` before merge  

---

## 🧩 Notes

- Backend must always respond to:
  - `/health` → `{ "status": "ok" }`
  - `/api/events` → List of events
- Frontend fetches from `VITE_API_URL` (defined in `.env`)
- AI training must remain local (no cloud API)

---

### 📅 Last Updated
2025-10-12 by Codex + Spandi99

```

---

## ✅ Anwendung

1️⃣ Lege sie im Repo ab als:
`project_docs/ROADMAP.md`

2️⃣ Push nach GitHub → Codex kann sie dann für alle nächsten Prompts referenzieren.

3️⃣ Beim nächsten Patch einfach sagen:

> “Codex, arbeite an Phase 2 aus ROADMAP.md.”

Er weiß dann automatisch, was gemeint ist.

---

Willst du, dass ich dir zusätzlich noch eine **`codex_prompts.md`** generiere,
die alle Prompts aus der Roadmap als einzeln ausführbare Blöcke enthält (direkt copy/paste für Codex)?
