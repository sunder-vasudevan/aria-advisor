"""
Advisor authentication router.
V1: validates against the seeded advisors table (bcrypt password check).
Returns advisor profile including location, role, referral_code.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..models import Advisor
from ..auth import verify_password

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


@router.post("/login", response_model=AdvisorProfile)
def advisor_login(payload: AdvisorLoginRequest, db: Session = Depends(get_db)):
    advisor = db.query(Advisor).filter(
        Advisor.username == payload.username,
        Advisor.is_active.is_(True),
    ).first()
    if not advisor or not verify_password(payload.password, advisor.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return advisor


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
    x_advisor_id: Optional[int] = Header(default=None),
):
    """Advisor updates their own profile (display_name, city, region)."""
    if not x_advisor_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    advisor = db.query(Advisor).filter(Advisor.id == x_advisor_id).first()
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    if payload.display_name is not None:
        advisor.display_name = payload.display_name.strip()
    if payload.city is not None:
        advisor.city = payload.city.strip() or None
    if payload.region is not None:
        advisor.region = payload.region.strip() or None
    db.commit()
    db.refresh(advisor)
    return advisor
