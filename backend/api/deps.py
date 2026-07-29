import json
import os
from fastapi import Header, HTTPException, Depends
from typing import Optional
import httpx
from config import settings

LOCAL_USERS_FILE = os.path.join(os.path.dirname(__file__), "..", "local_users.json")


async def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid Authorization header")
    token = authorization.removeprefix("Bearer ")

    # Local dev fallback
    if token.startswith("local_"):
        if os.path.exists(LOCAL_USERS_FILE):
            try:
                with open(LOCAL_USERS_FILE) as f:
                    users = json.load(f)
                # Return any user ID — accept local tokens during dev
                for email, u in users.items():
                    return u["id"]
            except (json.JSONDecodeError, OSError):
                pass
        return "local-dev-user-id"

    # Supabase auth verification
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={"apikey": settings.supabase_key, "Authorization": f"Bearer {token}"},
            )
            if resp.status_code != 200:
                raise HTTPException(401, "Invalid token")
            return resp.json()["id"]
    except httpx.HTTPError:
        raise HTTPException(401, "Auth service unavailable")
