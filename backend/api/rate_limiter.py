import time
from collections import defaultdict
from fastapi import HTTPException, Request
from typing import Callable


class RateLimiter:
    """Simple in-memory sliding-window rate limiter."""

    def __init__(self, max_requests: int, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: dict[str, list[float]] = defaultdict(list)

    def _clean(self, key: str, now: float) -> None:
        cutoff = now - self.window_seconds
        self._buckets[key] = [t for t in self._buckets[key] if t > cutoff]

    def check(self, key: str) -> bool:
        now = time.time()
        self._clean(key, now)
        if len(self._buckets[key]) >= self.max_requests:
            return False
        self._buckets[key].append(now)
        return True

    async def dependency(self, request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        if not self.check(client_ip):
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. Limit: {self.max_requests} per {self.window_seconds}s",
            )


# Shared instances with sensible defaults
login_limiter = RateLimiter(max_requests=10, window_seconds=60)
signup_limiter = RateLimiter(max_requests=5, window_seconds=60)
reset_limiter = RateLimiter(max_requests=3, window_seconds=300)
