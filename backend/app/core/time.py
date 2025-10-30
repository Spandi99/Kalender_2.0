"""Shared timezone and datetime utilities."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from zoneinfo import ZoneInfo

LOCAL_TIMEZONE = ZoneInfo("Europe/Zurich")
UTC = timezone.utc


def utc_now() -> datetime:
    """Return the current UTC timestamp as an aware datetime."""
    return datetime.now(tz=UTC)


def local_now() -> datetime:
    """Return the current local timestamp (Europe/Zurich)."""
    return datetime.now(tz=LOCAL_TIMEZONE)


def ensure_aware(timestamp: datetime) -> datetime:
    """Attach UTC to naive datetimes."""
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=UTC)
    return timestamp


def to_utc(timestamp: datetime) -> datetime:
    """Convert any datetime to UTC."""
    return ensure_aware(timestamp).astimezone(UTC)


def to_local(timestamp: datetime) -> datetime:
    """Convert any datetime to the local Europe/Zurich timezone."""
    return ensure_aware(timestamp).astimezone(LOCAL_TIMEZONE)


def coerce_iterable_to_utc(timestamps: Iterable[datetime]) -> list[datetime]:
    """Utility for bulk conversion."""
    return [to_utc(item) for item in timestamps]
