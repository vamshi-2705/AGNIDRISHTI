"""
AGNIDRISHTI - Production Security & Defense-in-Depth Middleware
Smart India Hackathon (SIH 2026) | Problem Statement 26162 (NTRO)

Components:
1. Thread-safe in-memory sliding-window token bucket rate limiter (RateLimiter)
2. HTTP Security Headers Middleware (SecurityHeadersMiddleware)
3. Secret & Credential Log Sanitization Utilities
"""

import os
import re
import time
import logging
from collections import defaultdict
from threading import Lock
from typing import Dict, List, Tuple, Optional, Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

logger = logging.getLogger("agnidrishti.security")

# Configuration from Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
ENABLE_CSP = os.getenv("ENABLE_CSP", "true").lower() in ("true", "1", "yes")

# Rate Limiter Configuration
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("true", "1", "yes")
RATE_LIMIT_DEFAULT = int(os.getenv("RATE_LIMIT_DEFAULT", "120"))  # req / minute
RATE_LIMIT_SENSITIVE = int(os.getenv("RATE_LIMIT_SENSITIVE", "30"))  # req / minute

# Regex patterns for sensitive URL/credential redaction
_CREDENTIAL_URL_PATTERN = re.compile(r"://([^:]+):([^@]+)@")
_NASA_KEY_PATTERN = re.compile(r"firms\.modaps\.eosdis\.nasa\.gov/api/area/csv/([a-zA-Z0-9_-]+)/")


def sanitize_log_message(msg: str) -> str:
    """
    Sanitizes strings before logging:
    - Redacts passwords in URLs (e.g. postgresql://user:pass@host -> postgresql://user:***@host)
    - Redacts NASA FIRMS map keys embedded in URLs
    """
    if not isinstance(msg, str):
        msg = str(msg)
    # Redact database URL credentials
    msg = _CREDENTIAL_URL_PATTERN.sub(r"://\1:***@", msg)
    # Redact NASA FIRMS map keys in URLs
    msg = _NASA_KEY_PATTERN.sub(r"firms.modaps.eosdis.nasa.gov/api/area/csv/***REDACTED***/", msg)
    return msg


class InMemoryRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter per client IP.
    Documented constraint: State is in-process and applies per worker.
    Distributed setups may introduce a centralized limiter in future phases.
    """

    def __init__(self):
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = Lock()

    def get_client_ip(self, request: Request) -> str:
        """Extracts client IP, respecting trusted proxy X-Forwarded-For if present."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "127.0.0.1"

    def is_rate_limited(self, client_ip: str, limit: int, window_seconds: int = 60) -> Tuple[bool, int, int, int]:
        """
        Evaluates rate limit for a client IP.
        Returns:
            (is_limited, remaining_requests, reset_seconds, limit)
        """
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            # Filter timestamps outside the sliding window
            timestamps = [ts for ts in self._requests[client_ip] if ts > window_start]
            
            if len(timestamps) >= limit:
                # Rate limit exceeded
                oldest = timestamps[0]
                retry_after = max(1, int(oldest + window_seconds - now))
                self._requests[client_ip] = timestamps
                return True, 0, retry_after, limit

            # Record this request
            timestamps.append(now)
            self._requests[client_ip] = timestamps
            remaining = max(0, limit - len(timestamps))
            return False, remaining, window_seconds, limit

    def reset(self):
        """Resets all tracking (useful for testing)."""
        with self._lock:
            self._requests.clear()


# Global singleton rate limiter
rate_limiter = InMemoryRateLimiter()

# Paths considered computationally expensive or sensitive to abuse
SENSITIVE_PATHS = {
    "/api/osm/live-verify",
    "/api/incident/report",
    "/api/plume",
    "/api/satellite-evidence"
}


class SecurityHeadersAndRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Combined high-performance ASGI middleware:
    1. Enforces rate limits per client IP on API routes
    2. Attaches defense-in-depth HTTP security headers
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # 1. Evaluate Rate Limiting on API endpoints
        if RATE_LIMIT_ENABLED and path.startswith("/api/"):
            client_ip = rate_limiter.get_client_ip(request)
            
            # Sensitive / compute-heavy endpoints have tighter limits
            is_sensitive = any(path.startswith(prefix) for prefix in SENSITIVE_PATHS)
            limit = RATE_LIMIT_SENSITIVE if is_sensitive else RATE_LIMIT_DEFAULT

            is_limited, remaining, retry_after, max_limit = rate_limiter.is_rate_limited(
                client_ip=client_ip,
                limit=limit,
                window_seconds=60
            )

            if is_limited:
                logger.warning(
                    f"Rate limit exceeded for client {client_ip} on {path} "
                    f"(limit: {limit}/min, retry_after: {retry_after}s)"
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "detail": f"Rate limit exceeded ({limit} requests/minute). Please retry in {retry_after} seconds.",
                        "status_code": 429,
                        "path": path,
                        "retry_after_seconds": retry_after
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(max_limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(retry_after)
                    }
                )

        # 2. Process the request
        response: Response = await call_next(request)

        # 3. Inject HTTP Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=(), payment=()"

        # Content Security Policy (Tailored for Cesium 3D, Leaflet, OSM/CartoDB tiles, Open-Meteo)
        if ENABLE_CSP:
            csp_directives = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cesium.com https://*.cesium.com",
                "worker-src 'self' blob:",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com data:",
                "img-src 'self' data: blob: https:",
                "connect-src 'self' https: wss: http://127.0.0.1:* http://localhost:*",
                "object-src 'none'",
                "frame-ancestors 'none'"
            ]
            response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # HSTS (Strict-Transport-Security): Only in production over HTTPS
        if ENVIRONMENT == "production" and request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response
