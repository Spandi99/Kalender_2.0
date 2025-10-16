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
🧩 3.1 Enhanced Feedback & Behavior Data Capture

Erweiterung der Feedback-Erhebung zur besseren Trainingsgrundlage für KI-Modelle.

Neue Datenpunkte:

Task-Completion-Status (✅ / ❌)

Reason für Nicht-Abschluss

Pünktlichkeits-Daten (on time / late / early, Delay-Minuten)

Dauer-Abweichung (actual vs planned)

Ziele:

Verbesserung der Vorhersagegenauigkeit für Motivation und Zeitplanung

Grundlage für zukünftige „Smart Rescheduling“- und „AI Coach“-Funktionen

Umsetzung:

Backend-Erweiterung Feedback-Modell

Frontend-UI im Feedback-Modal mit neuen Eingaben

XP-Berechnung = 0, wenn completed == false

Phase 4: Day Template System

Benutzer können mehrere Tagesvorlagen („Weekday“, „Weekend“, „Focus Day“ usw.) definieren.
Das System generiert automatisch Zeitblöcke (z. B. „Lernen 08:00–12:00“) und passt diese an bestehende Termine an.
Blöcke, die durch Termine unterbrochen werden, werden dynamisch verkürzt oder aufgeteilt.

Ziele:

Wiederverwendbare Tagesstrukturen (Templates) erstellen und speichern.

Automatische Block-Generierung auf Basis der aktiven Vorlage.

Automatische Anpassung an vorhandene Kalender-Events (keine Überschneidungen).

Blöcke < 1 h werden ignoriert oder zusammengefasst.

Deliverables:

Neues Modul day_templates im Backend.

API:

GET /api/templates/ – Liste der Vorlagen

POST /api/templates/ – Neue Vorlage speichern

POST /api/templates/apply – Template auf Tag anwenden → generiert Event-Blöcke

Frontend-UI: Template-Editor + Button „Apply Template to Day“.

Intelligente Block-Anpassung (z. B. wenn Termin 09:00 → Lernblock 08–09 & 11–12).

📅 Phase 5: iCal Import & Synchronisation

Benutzer sollen Kalender aus externen Quellen (z. B. Google Calendar, Outlook, Apple Calendar)
über iCal-Links importieren können. Diese Events werden in der internen Datenbank gespiegelt,
damit der AI Assist und das Adaptive Scheduling auf vollständige Daten zugreifen können.

🎯 Ziele

Unterstützung für .ics / iCal URLs (z. B. https://calendar.google.com/calendar/ical/.../basic.ics)

Automatischer Import aller zukünftigen Events

Optional: periodische Synchronisation (z. B. 1× täglich)

Deduplizierung anhand UID aus der iCal-Datei



📂 Deliverables

Backend:

Neues Modul app/modules/ical_import/

parser.py: Parsen von .ics-Dateien mit icalendar

service.py: Import-Logik + Duplikat-Erkennung

router.py: Endpoints

POST /api/ical/import → Einmaliger Import aus URL oder Upload

POST /api/ical/sync → Manuelles Sync-Triggern

Integration in bestehende DB-Tabelle für Events

Frontend:

Neues UI-Panel „External Calendars“ im Einstellungsbereich:

Feld für iCal-Link

Button „Import Now“

Liste importierter Kalender + letzter Sync

Sonstiges:

Logging der Importaktivität

Fehlerbehandlung für ungültige oder private Links

Phase 6: AI Assist Core (Behavior Analysis & Recommendations)

Aufbau des intelligenten Analysemoduls, das aus Feedback-, Event- und XP-Daten automatisch Muster erkennt und Empfehlungen erstellt.
Ziel ist es, Benutzerverhalten zu verstehen (Pünktlichkeit, Abschlussquote, Energiezyklen) und konstruktive Vorschläge zur Verbesserung zu liefern.

Ziele:

Analyse von Pünktlichkeit, Completion Rate, Stimmung und Feedback-Gründen.

Generierung einfacher Handlungsempfehlungen.

Vorbereitung auf Machine-Learning-Modelle (später in Phase 6).

Deliverables:

Neues Modul ai_assist im Backend.

Endpoint /api/ai/insights.

Frontend-Komponente AI Insights Panel mit Handlungsempfehlungen.

Erweiterung der Feedback-Zusammenfassung um heuristische Analyse.

Phase 7: Adaptive Scheduling System

Aufbau eines Systems, das automatisch Zeitblöcke anpasst, priorisiert oder Vorschläge zur Tagesplanung macht — basierend auf der Analyse des AI-Assist-Cores.

Ziele:

Dynamische Anpassung von Tagesvorlagen und Terminen.

Erkennung ineffizienter oder zu dichter Zeitpläne.

Vorschläge für alternative Blöcke („verschiebe dein Lernfenster um 30 Minuten“).

Deliverables:

Erweiterung des Backends mit adaptiven Scheduling-Logiken.

Integration mit bestehenden calendar- und feedback-Modulen.

Frontend-Vorschlagsmodul mit Vorschau & „Apply Changes“-Button.

Berücksichtigung der definierten Tages-Templates.



🔮 Phase 8 : Learning & Optimization (AI Self-Tuning System)

Ziel:
Das System soll auf Basis historischer Daten (Events, Feedback, XP, Tagesmuster) selbstständig lernen,
welche Tagesstrukturen, Zeitfenster und Aktivitätsblöcke für den Nutzer optimal sind.
Statt nur reaktiv Templates zu verschieben (wie in Phase 6),
entwickelt es nun eigene Vorschläge und passt Templates iterativ an.

Kernziele:

Lernmodell (AI Core):

Analysiert langfristige Trends (über Tage/Wochen).

Ermittelt Produktivitätsfenster, wiederkehrende Muster und Abweichungen.

Bewertet die Wirksamkeit von Templates (z. B. wie oft geplante Blöcke tatsächlich erfüllt werden).

Passt Templates automatisch an und dokumentiert Änderungen (Audit).

Optimierung:

Schlägt Änderungen proaktiv vor („Möchtest du deinen Lernblock von 08:00 auf 09:00 verschieben?“).

Erkennt inaktive Zeiten (Blöcke oft übersprungen) und entfernt oder ersetzt sie.

Nutzt Feedback (mood, completion rate) und XP-Verlauf, um Wochenroutinen zu verbessern.

Machine-Learning-Komponente:

Kein externer API-Aufruf (läuft lokal).

Verwendet einfache Regressions- oder Clustering-Ansätze (z. B. K-Means auf produktiven Stunden).

Speicherung des Modells in der DB (z. B. JSON-Struktur mit learned preferences).

Transparente Benutzerkontrolle:

Der Nutzer sieht Vorschläge (nicht automatische Änderungen ohne Zustimmung).

Kann Änderungen annehmen, ablehnen oder temporär pausieren.

Änderungen und Lernverlauf werden im „AI-Assist Dashboard“ angezeigt.

Integration:

Nahtlos eingebunden in bestehende Adaptive Scheduling Logik.

Nutzt XP-/Feedback-Daten, Day Templates, Calendar Events (lokal & iCal).

Keine Blöcke unter 60 Minuten, volle Kompatibilität mit vorhandenen Mechanismen.

Beispiel:

Der Nutzer hat in den letzten 3 Wochen Lernblöcke um 08:00 Uhr nur zu 30 % abgeschlossen,
aber ab 09:00 Uhr zu 90 %.

→ Das System schlägt automatisch vor, den „Morning Study“-Block um +1 h zu verschieben
und die XP-Verteilung leicht anzupassen (mehr Fokus-XP für spätere Stunden)..

Development Workflow:

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

