"""
Auth router — HTTP endpoints for authentication.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status

from app.core.dependencies import AsyncSessionDep, CurrentUserIdDep, get_client_ip, get_user_agent
from app.modules.auth.schemas import (
    ApiResponse,
    AuthResponse,
    LoginRequest,
    LogoutRequest,
    RegisterRequest,
    UserResponse,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    data: RegisterRequest,
    request: Request,
    session: AsyncSessionDep,
) -> dict:
    service = AuthService(session)
    ip = get_client_ip(request)
    ua = get_user_agent(request)
    result = await service.register(data, ip_address=ip, user_agent=ua)
    return {
        "success": True,
        "message": "Registration successful",
        "data": result.model_dump(mode="json"),
    }


@router.post(
    "/login",
    response_model=ApiResponse,
    summary="Login with email and password",
)
async def login(
    data: LoginRequest,
    request: Request,
    session: AsyncSessionDep,
) -> dict:
    service = AuthService(session)
    ip = get_client_ip(request)
    ua = get_user_agent(request)
    result = await service.login(data, ip_address=ip, user_agent=ua)
    return {
        "success": True,
        "message": "Login successful",
        "data": result.model_dump(mode="json"),
    }


@router.post(
    "/logout",
    response_model=ApiResponse,
    summary="Logout and revoke session",
)
async def logout(
    data: LogoutRequest,
    request: Request,
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = AuthService(session)
    ip = get_client_ip(request)
    ua = get_user_agent(request)
    await service.logout(
        user_id=user_id,
        ip_address=ip,
        user_agent=ua,
        refresh_token=data.refresh_token,
    )
    return {
        "success": True,
        "message": "Logged out successfully",
        "data": None,
    }


@router.get(
    "/me",
    response_model=ApiResponse,
    summary="Get current authenticated user",
)
async def get_me(
    session: AsyncSessionDep,
    user_id: CurrentUserIdDep,
) -> dict:
    service = AuthService(session)
    user = await service.get_current_user(user_id)
    return {
        "success": True,
        "message": "User retrieved",
        "data": user.model_dump(mode="json"),
    }
