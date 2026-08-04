import json
import os
import secrets
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator
import httpx
import bcrypt
import hashlib
from config import settings
from api.rate_limiter import login_limiter, signup_limiter, reset_limiter

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        if len(v) > 255:
            raise ValueError("Email too long")
        if "@" not in v:
            raise ValueError("Invalid email")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Min 6 characters")
        if len(v) > 128:
            raise ValueError("Max 128 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        return v.strip().lower()


SUPABASE_AUTH_URL = f"{settings.supabase_url}/auth/v1"
LOCAL_USERS_FILE = os.path.join(os.path.dirname(__file__), "..", "local_users.json")
TOKEN_EXPIRY_SECONDS = 86400  # 24h

# In-memory token store: token -> {user_id, email, created_at}
_tokens: dict[str, dict] = {}


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
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    # Legacy accounts (created before bcrypt) were stored as bare SHA-256 hex.
    # Accept those so existing users aren't locked out, and flag for migration.
    if len(hashed) == 64 and all(c in "0123456789abcdef" for c in hashed.lower()):
        return hashlib.sha256(password.encode()).hexdigest() == hashed.lower()
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _is_legacy_sha256(hashed: str) -> bool:
    return len(hashed) == 64 and all(c in "0123456789abcdef" for c in hashed.lower())


def _make_token(email: str, user_id: str) -> str:
    token = f"local_{secrets.token_hex(32)}"
    _tokens[token] = {
        "user_id": user_id,
        "email": email,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return token


def validate_local_token(token: str) -> str | None:
    """Returns user_id if token is valid, None otherwise."""
    data = _tokens.get(token)
    if not data:
        return None
    created = data.get("created_at")
    if created:
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(created)).total_seconds()
        if age > TOKEN_EXPIRY_SECONDS:
            del _tokens[token]
            return None
    return data["user_id"]


@router.post("/signup")
async def signup(body: SignupRequest, _=Depends(signup_limiter.dependency)):
    # Try Supabase first
    if settings.supabase_url and settings.supabase_key:
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
        except httpx.HTTPError:
            pass

    # Fallback to local auth
    users = _load_users()
    email = body.email
    if email in users:
        raise HTTPException(400, "User already exists")
    user_id = str(uuid.uuid4())
    users[email] = {
        "password": _hash_password(body.password),
        "id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _save_users(users)
    token = _make_token(email, user_id)
    return {"access_token": token, "token_type": "bearer", "user": {"id": user_id, "email": email}}


@router.post("/login")
async def login(body: LoginRequest, _=Depends(login_limiter.dependency)):
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
    email = body.email
    user = users.get(email)
    if not user or not _verify_password(body.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    # Migrate legacy SHA-256 hash to bcrypt on first successful login
    if _is_legacy_sha256(user["password"]):
        user["password"] = _hash_password(body.password)
        users[email] = user
        _save_users(users)
    token = _make_token(email, user["id"])
    return {"access_token": token, "token_type": "bearer", "user": {"id": user["id"], "email": email}}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, _=Depends(reset_limiter.dependency)):
    supabase_url = settings.supabase_url
    if not supabase_url:
        return {"message": "Password reset not available in local mode"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{SUPABASE_AUTH_URL}/recover",
            headers={
                "apikey": settings.supabase_key,
                "Content-Type": "application/json",
            },
            json={"email": body.email},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get("msg", "Reset failed"))
        return {"message": "Check your email for reset link"}


@router.get("/me")
async def get_user():
    return {"message": "Send Authorization: Bearer <token> header"}
