from datetime import datetime
from typing import Any


def utc_now_iso() -> str:
    """Return the current UTC timestamp in ISO format."""

    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def standard_response(data: Any, message: str = "success") -> dict[str, Any]:
    """Wrap API responses in a consistent structure."""

    return {"timestamp": utc_now_iso(), "message": message, "data": data}
