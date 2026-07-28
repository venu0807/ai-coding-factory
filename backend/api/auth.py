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

@router.post("/signup")
async def signup(body: SignupRequest):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_AUTH_URL}/signup",
            headers={
                "apikey": settings.supabase_key,
                "Content-Type": "application/json",
            },
            json={"email": body.email, "password": body.password},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get("msg", "Signup failed"))
        return resp.json()

@router.post("/login")
async def login(body: LoginRequest):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_AUTH_URL}/token?grant_type=password",
            headers={
                "apikey": settings.supabase_key,
                "Content-Type": "application/json",
            },
            json={"email": body.email, "password": body.password},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail="Invalid credentials")
        return resp.json()

@router.get("/me")
async def get_user():
    return {"message": "Send Authorization: Bearer <token> header"}
