"""
Advisor authentication router.
V2: issues JWT on login + sets httpOnly cookie. Reads advisor identity from cookie.
"""
import os
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..models import Advisor
from ..auth import verify_password, create_access_token, get_current_advisor_user

router = APIRouter(prefix="/advisor", tags=["advisor-auth"])


class AdvisorLoginRequest(BaseModel):
    username: str
    password: str


class AdvisorProfile(BaseModel):
    id: int
    username: str
    display_name: str
    role: str
    city: Optional[str]
    region: Optional[str]
    referral_code: Optional[str]
    avg_rating: Optional[float]
    rating_count: Optional[int]

    class Config:
        from_attributes = True


class AdvisorLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    advisor: AdvisorProfile


@router.post("/login", response_model=AdvisorLoginResponse)
def advisor_login(payload: AdvisorLoginRequest, response: Response, db: Session = Depends(get_db)):
    advisor = db.query(Advisor).filter(
        Advisor.username == payload.username,
        Advisor.is_active.is_(True),
    ).first()
    if not advisor or not verify_password(payload.password, advisor.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token({"sub": "advisor", "advisor_id": advisor.id, "role": advisor.role})
    cookie_secure = os.getenv("COOKIE_SECURE", "true") == "true"
    response.set_cookie(
        "aria_advisor_token", token,
        httponly=True,
        secure=cookie_secure,
        samesite="none",
        max_age=604800,
    )
    return AdvisorLoginResponse(access_token=token, token_type="bearer", advisor=AdvisorProfile.model_validate(advisor))


@router.post("/logout")
def advisor_logout(response: Response):
    response.delete_cookie("aria_advisor_token", samesite="none", secure=True)
    return {"ok": True}


@router.get("/profile/{username}", response_model=AdvisorProfile)
def get_advisor_profile(username: str, db: Session = Depends(get_db)):
    advisor = db.query(Advisor).filter(Advisor.username == username).first()
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    return advisor


@router.get("/all", response_model=list[AdvisorProfile])
def list_advisors(db: Session = Depends(get_db)):
    """List all active advisors — used for advisor discovery (V2)."""
    return db.query(Advisor).filter(Advisor.is_active.is_(True)).all()


class AdvisorUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None


@router.put("/me", response_model=AdvisorProfile)
def update_advisor_profile(
    payload: AdvisorUpdateRequest,
    db: Session = Depends(get_db),
    current_advisor: Advisor = Depends(get_current_advisor_user),
):
    """Advisor updates their own profile (display_name, city, region)."""
    if payload.display_name is not None:
        current_advisor.display_name = payload.display_name.strip()
    if payload.city is not None:
        current_advisor.city = payload.city.strip() or None
    if payload.region is not None:
        current_advisor.region = payload.region.strip() or None
    db.commit()
    db.refresh(current_advisor)
    return current_advisor
