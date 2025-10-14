"""Utilities for fetching and parsing iCal feeds."""
from __future__ import annotations

from typing import Dict, List

import requests
from icalendar import Calendar


def fetch_and_parse_ical(url: str) -> List[Dict[str, object]]:
    """Fetch an iCal feed and return event dictionaries."""
    response = requests.get(url, timeout=10)
    response.raise_for_status()

    calendar = Calendar.from_ical(response.text)
    events: List[Dict[str, object]] = []

    for component in calendar.walk("VEVENT"):
        events.append(
            {
                "uid": str(component.get("UID")),
                "title": str(component.get("SUMMARY")),
                "start": component.get("DTSTART").dt,
                "end": component.get("DTEND").dt,
            }
        )

    return events
