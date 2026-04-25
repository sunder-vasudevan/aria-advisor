from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from ..database import get_db
from ..models import Advisor, Client, Trade, Portfolio
from ..auth import get_current_advisor_user

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_superadmin(current_advisor=Depends(get_current_advisor_user)):
    if current_advisor.role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")


@router.get("/advisors")
def list_advisors(
    db: Session = Depends(get_db),
    _: None = Depends(_require_superadmin),
):
    advisors = db.query(Advisor).order_by(Advisor.created_at.desc()).all()
    result = []
    for a in advisors:
        client_count = db.query(func.count(Client.id)).filter(Client.advisor_id == a.id).scalar() or 0
        active_count = (
            db.query(func.count(Client.id))
            .filter(Client.advisor_id == a.id, Client.lifecycle_stage == "active")
            .scalar() or 0
        )
        total_aum = (
            db.query(func.sum(Portfolio.total_value))
            .join(Client, Client.id == Portfolio.client_id)
            .filter(Client.advisor_id == a.id)
            .scalar() or 0
        )
        pending_trades = (
            db.query(func.count(Trade.id))
            .filter(Trade.advisor_id == a.id, Trade.status == "pending_approval")
            .scalar() or 0
        )
        result.append({
            "id": a.id,
            "username": a.username,
            "display_name": a.display_name,
            "role": a.role,
            "city": a.city,
            "region": a.region,
            "is_active": a.is_active,
            "referral_code": a.referral_code,
            "client_count": client_count,
            "active_clients": active_count,
            "total_aum": round(total_aum, 2),
            "pending_trades": pending_trades,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    return result


@router.patch("/advisors/{advisor_id}/deactivate")
def deactivate_advisor(
    advisor_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(_require_superadmin),
):
    advisor = db.query(Advisor).filter(Advisor.id == advisor_id).first()
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    advisor.is_active = False
    db.commit()
    return {"id": advisor_id, "is_active": False}


@router.patch("/advisors/{advisor_id}/activate")
def activate_advisor(
    advisor_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(_require_superadmin),
):
    advisor = db.query(Advisor).filter(Advisor.id == advisor_id).first()
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    advisor.is_active = True
    db.commit()
    return {"id": advisor_id, "is_active": True}
