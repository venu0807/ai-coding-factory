import hashlib
import json
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

class SignupRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

SUPABASE_AUTH_URL = f"{settings.supabase_url}/auth/v1"
LOCAL_USERS_FILE = os.path.join(os.path.dirname(__file__), "..", "local_users.json")


def _load_users() -> dict:
    if os.path.exists(LOCAL_USERS_FILE):
        try:
            with open(LOCAL_USERS_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_users(users: dict):
    with open(LOCAL_USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _make_fake_token(email: str) -> str:
    return f"local_{hashlib.md5((email + datetime.now(timezone.utc).isoformat()).encode()).hexdigest()}"


@router.post("/signup")
async def signup(body: SignupRequest):
    # Try Supabase first
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{SUPABASE_AUTH_URL}/signup",
                headers={
                    "apikey": settings.supabase_key,
                    "Content-Type": "application/json",
                },
                json={"email": body.email, "password": body.password},
            )
            if resp.status_code < 400:
                return resp.json()
            if resp.status_code != 429:
                raise HTTPException(status_code=resp.status_code, detail=resp.json().get("msg", "Signup failed"))
    except httpx.HTTPError:
        pass

    # Fallback to local auth
    users = _load_users()
    if body.email in users:
        raise HTTPException(400, "User already exists")
    users[body.email] = {
        "password": _hash_password(body.password),
        "id": hashlib.md5(body.email.encode()).hexdigest(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _save_users(users)
    token = _make_fake_token(body.email)
    return {"access_token": token, "token_type": "bearer", "user": {"id": users[body.email]["id"], "email": body.email}}


@router.post("/login")
async def login(body: LoginRequest):
    # Try Supabase first
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{SUPABASE_AUTH_URL}/token?grant_type=password",
                headers={
                    "apikey": settings.supabase_key,
                    "Content-Type": "application/json",
                },
                json={"email": body.email, "password": body.password},
            )
            if resp.status_code < 400:
                return resp.json()
    except httpx.HTTPError:
        pass

    # Fallback to local auth
    users = _load_users()
    user = users.get(body.email)
    if not user or user["password"] != _hash_password(body.password):
        raise HTTPException(401, "Invalid credentials")
    token = _make_fake_token(body.email)
    return {"access_token": token, "token_type": "bearer", "user": {"id": user["id"], "email": body.email}}


@router.get("/me")
async def get_user():
    return {"message": "Send Authorization: Bearer <token> header"}
