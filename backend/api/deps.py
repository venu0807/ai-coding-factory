from fastapi import Header, HTTPException, Depends
from typing import Optional
import httpx
from config import settings


async def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid Authorization header")
    token = authorization.removeprefix("Bearer ")
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
