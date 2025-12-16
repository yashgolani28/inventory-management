from datetime import timedelta

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from .auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
    UserModel,
)
from .database import get_session
from .models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=dict)
def register(user_data: UserCreate, session: Session = Depends(get_session)):
    """Register a new user"""
    existing = session.exec(select(User).where(User.username == user_data.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"message": "User created successfully", "username": user.username}


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, session: Session = Depends(get_session)):
    """Login and get access token"""
    user = session.exec(select(User).where(User.username == credentials.username)).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=dict)
def read_users_me(current_user: UserModel = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
    }

