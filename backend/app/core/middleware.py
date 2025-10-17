from __future__ import annotations

import logging
import traceback
from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class ExceptionLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:  # pragma: no cover - logging side-effect only
            logging.error("❌ Exception: %s\n%s", exc, traceback.format_exc())
            raise


class RequestResponseLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        logger = logging.getLogger("app.request")
        logger.info("➡️  %s %s", request.method, request.url.path)
        response = await call_next(request)
        logger.info("⬅️  %s %s %s", request.method, request.url.path, response.status_code)
        return response
