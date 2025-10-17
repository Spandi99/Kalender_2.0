from __future__ import annotations

from sqlalchemy import text

from app.core.database import Base, SessionLocal


def run_diagnostics() -> None:
    print("Running system diagnostics...")
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
        print("✅ Database connected.")
        print("📋 Tables:", list(Base.metadata.tables.keys()))
        print("📅 Events:", db.execute(text("SELECT COUNT(*) FROM events")).scalar())


if __name__ == "__main__":
    run_diagnostics()
