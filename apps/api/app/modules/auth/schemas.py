"""
Auth schemas — Pydantic models for request/response validation.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# --- Request Schemas ---

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255, examples=["John Doe"])
    email: EmailStr = Field(..., examples=["john@example.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["SecureP@ss123"])
    phone: str | None = Field(None, max_length=20, examples=["+919876543210"])
    accept_terms: bool = Field(..., description="User must accept terms of service")
    accept_privacy: bool = Field(..., description="User must accept privacy policy")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., examples=["john@example.com"])
    password: str = Field(..., examples=["SecureP@ss123"])


class LogoutRequest(BaseModel):
    refresh_token: str | None = Field(None, description="Optional refresh token to revoke")


# --- Response Schemas ---

class UserResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: str | None
    status: str
    email_verified: bool
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse


# --- Generic API Response Wrappers ---

class ApiResponse(BaseModel):
    success: bool = True
    message: str
    data: dict | list | None = None


class ApiErrorResponse(BaseModel):
    success: bool = False
    message: str
    error_code: str
