Perfekt 🔥
Dann erstellen wir jetzt deine **Codex-kompatible Projektplan-Datei**,
die du bei jeder neuen Codex-Anfrage als Basis anhängen kannst.

Ich bereite sie in Markdown-Struktur vor — also perfekt lesbar für Codex und GitHub zugleich.
Du kannst sie z. B. speichern unter:
📄 `docs/project_plan.md`

---

# 🧠 **AI Calendar XP – Project Plan**

## 📘 Overview

**AI Calendar XP** ist ein persönlicher, lokal laufender Kalender- und Planungshub,
der klassische Kalenderfunktionen mit motivierenden RPG-Elementen (XP-System)
und intelligentem Tages-Optimierer (lokal trainiertes AI-Modul) kombiniert.

Das Projekt läuft auf einem **Raspberry Pi (aktuell RPi 5, 16 GB RAM)**
und soll sowohl über Desktop (Browser/PC) als auch iPhone erreichbar sein.

---

## ⚙️ Technology Stack

| Layer                | Technology                                          | Purpose                                       |
| -------------------- | --------------------------------------------------- | --------------------------------------------- |
| **Frontend**         | React + TypeScript + Vite + Tailwind + FullCalendar | UI, Kalenderanzeige, XP-Dashboard             |
| **Backend**          | FastAPI (Python)                                    | REST-API, Datenmanagement, AI-Integration     |
| **Database**         | PostgreSQL                                          | Event-, XP- und User-Daten                    |
| **Containerization** | Docker Compose                                      | Multi-Service Setup (Frontend + Backend + DB) |
| **Persistence**      | SQLAlchemy ORM                                      | Datenbankzugriff                              |
| **Version Control**  | GitHub + Codex                                      | Entwicklungs- und Feature-Management          |

---

## 🧩 Current Features

✅ UI mit Kalender (FullCalendar)
✅ Wochen-/Monatsansicht
✅ „Add Event“-Modal mit Eingabefeldern
✅ Grundstruktur für XP-Anzeige und Feedback-Karten
✅ Docker-Setup läuft stabil (Frontend + Backend + Postgres)

---

## 🚧 Upcoming Milestones

### 🧱 **1. Persistent Event Storage**

* Implementiere CRUD-Endpoints `/events` im Backend (FastAPI)
* Datenmodell: `Event(id, title, start, end, category, description)`
* Frontend:

  * Beim Öffnen → `GET /api/events` laden
  * Beim Speichern → `POST /api/events`
  * Optional: `PUT`, `DELETE`
* Events sollen nach Reload bestehen bleiben.

### ⚡ **2. XP System (Gamification Layer)**

* XP-Punkte beim erfolgreichen Abschluss von Tasks oder Events.
* Kategorien beeinflussen Attribute:

  * `Athletic`, `Focus`, `Creativity`, `Discipline`, etc.
* Fortschrittsanzeige als Level-Bar & Statistik.
* Später optional kleine Character-Animation oder Avatare.

### 🧠 **3. Smart Day Planner (Local AI)**

* Lokale AI-Komponente trainiert aus Nutzerdaten:

  * Lerneffekt aus Feedbacks (Erledigt? Anstrengend? Stimmung?)
  * Vorschläge: mehr Schlaf, längere Lernphasen, kürzere Meetings, Freizeitblöcke etc.
* Auto-Scheduler:

  * Erkennt freie Zeiten und schlägt Aufgabenplatzierung vor.
  * Anpassung basierend auf Standard-Tag-Entwürfen (Templates).

### 🧩 **4. Day Template System**

* User kann mehrere „Standard-Tage“ definieren (z. B. „Weekday“, „Weekend“).
* System plant automatisch Blöcke (z. B. Lernen 08–12 Uhr),
  passt aber automatisch an bestehende Termine an:

  * Falls Termin um 09:00 Uhr → Lernblock von 08:00–09:00 Uhr und 11:00–12:00 Uhr.
  * Blöcke kürzer als 1 h werden nicht erstellt.

---

## 🧭 Development Workflow

1. **Branches**

   * `main` → nur stabile Versionen
   * `dev` → Entwicklungsintegration
   * `feature/*` → für einzelne Codex- oder manuelle Änderungen

2. **Codex Integration**

   * Codex arbeitet automatisch auf neuen Branches, z. B.
     `codex/persistent-event-storage`
   * Nach Pull Request → Merge in `dev`, Test → Merge in `main`.

3. **Deployment**

   ```bash
   git checkout main
   git pull origin main
   docker compose down
   docker compose build
   docker compose up -d
   ```

4. **Branch Protection**

   * `main` ist geschützt, nur Pull Requests mit Review
   * Codex arbeitet bevorzugt auf `dev`

---

## 🧰 Local Deployment

* Läuft auf `Raspberry Pi 5`
* Frontend: `localhost:5173`
* Backend: `localhost:8000`
* PostgreSQL: `localhost:5432`
* Alle Services via `docker-compose up -d`

---

## 🔮 Future Integration Ideas

* Local AI Scheduler mit PyTorch / scikit-learn
* Custom Feedback Form (Mood, Difficulty, Delay Reason)
* Voice Input oder Shortcuts
* Mobile-friendly PWA für iPhone-Sync

---
## 🎮 Avatar & Level Progression (Planned)

Once the XP and feedback systems are stable and integrated:
- Introduce a personal avatar representing user progress.
- Avatar changes visually based on XP level thresholds (e.g., novice → skilled → expert).
- Different themes or items unlocked at milestones.
- Animated reactions (e.g., happy on XP gain, tired when many tasks left).
- Integration with XP Dashboard for seamless visual feedback.

## 💡 Guideline for Codex Requests

Bei jedem Codex-Request:

1. **Anhängen:** diese Datei (`docs/project_plan.md`)
2. **Tag:** `#plan`
3. **Prompt-Beispiel:**

   ```text
   #plan
   Implement persistent calendar event storage as described in the project plan.
   Ensure compatibility with the current FastAPI + PostgreSQL + Docker setup.
   ```

---

Damit hat Codex bei jedem Request:

* den Projektkontext,
* Architekturziele,
* und unseren Entwicklungsworkflow.

---

