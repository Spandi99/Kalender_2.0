"""Utilities for fetching and parsing iCal feeds."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

import requests
from icalendar import Calendar


def fetch_and_parse_ical(url: str) -> List[Dict[str, object]]:
    """Fetch an iCal feed and return event dictionaries."""
    response = requests.get(url, timeout=10)
    response.raise_for_status()

    calendar = Calendar.from_ical(response.content)
    events: List[Dict[str, object]] = []

    for component in calendar.walk("VEVENT"):
        dtstart = _coerce_component_datetime(component.get("DTSTART"))
        if dtstart is None:
            # DTSTART is mandatory for events; skip components we cannot interpret.
            continue

        dtend = _coerce_component_datetime(component.get("DTEND"))
        if dtend is None:
            duration = component.get("DURATION")
            duration_value = None
            if duration is not None:
                if hasattr(duration, "dt"):
                    duration_value = duration.dt
                elif isinstance(duration, timedelta):
                    duration_value = duration

            if duration_value is not None:
                dtend = dtstart + duration_value

        events.append(
            {
                "uid": str(component.get("UID")),
                "title": str(component.get("SUMMARY")),
                "start": dtstart,
                "end": dtend,
            }
        )

    return events


def _coerce_component_datetime(component_value: object) -> Optional[datetime]:
    """Normalize iCal component date/time values to datetimes."""

    if component_value is None or not hasattr(component_value, "dt"):
        return None

    value = component_value.dt

    if isinstance(value, datetime):
        return value

    # Convert date instances into datetimes at midnight.
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())

    return value
