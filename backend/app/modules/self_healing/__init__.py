"""Self-healing subsystem module."""

from . import models  # noqa: F401 - ensure models are registered with SQLAlchemy

__all__ = ["models"]
