from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Prospect, ProspectStageEnum, Client
from ..schemas import ProspectCreate, ProspectUpdate, ProspectStageUpdate, ProspectOut

router = APIRouter(prefix="/prospects", tags=["prospects"])


def _get_advisor_id(x_advisor_id: Optional[str] = Header(None)) -> int:
    if not x_advisor_id:
        raise HTTPException(status_code=401, detail="X-Advisor-Id header required")
    return int(x_advisor_id)


@router.get("", response_model=List[ProspectOut])
def list_prospects(
    advisor_id: int = Depends(_get_advisor_id),
    db: Session = Depends(get_db),
):
    return (
        db.query(Prospect)
        .filter(Prospect.advisor_id == advisor_id)
        .order_by(Prospect.created_at.desc())
        .all()
    )


@router.post("", response_model=ProspectOut, status_code=201)
def create_prospect(
    payload: ProspectCreate,
    advisor_id: int = Depends(_get_advisor_id),
    db: Session = Depends(get_db),
):
    prospect = Prospect(
        advisor_id=advisor_id,
        name=payload.name,
        estimated_aum=payload.estimated_aum,
        source=payload.source,
        notes=payload.notes,
    )
    db.add(prospect)
    db.commit()
    db.refresh(prospect)
    return prospect


@router.get("/{prospect_id}", response_model=ProspectOut)
def get_prospect(
    prospect_id: int,
    advisor_id: int = Depends(_get_advisor_id),
    db: Session = Depends(get_db),
):
    prospect = db.query(Prospect).filter(
        Prospect.id == prospect_id,
        Prospect.advisor_id == advisor_id,
    ).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    return prospect


@router.put("/{prospect_id}", response_model=ProspectOut)
def update_prospect(
    prospect_id: int,
    payload: ProspectUpdate,
    advisor_id: int = Depends(_get_advisor_id),
    db: Session = Depends(get_db),
):
    prospect = db.query(Prospect).filter(
        Prospect.id == prospect_id,
        Prospect.advisor_id == advisor_id,
    ).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(prospect, field, val)
    prospect.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prospect)
    return prospect


@router.patch("/{prospect_id}/stage", response_model=ProspectOut)
def update_stage(
    prospect_id: int,
    payload: ProspectStageUpdate,
    advisor_id: int = Depends(_get_advisor_id),
    db: Session = Depends(get_db),
):
    try:
        new_stage = ProspectStageEnum(payload.stage)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid stage: {payload.stage}")

    prospect = db.query(Prospect).filter(
        Prospect.id == prospect_id,
        Prospect.advisor_id == advisor_id,
    ).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    prospect.stage = new_stage
    prospect.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prospect)
    return prospect


@router.patch("/{prospect_id}/convert", response_model=ProspectOut)
def convert_to_client(
    prospect_id: int,
    advisor_id: int = Depends(_get_advisor_id),
    db: Session = Depends(get_db),
):
    """Mark Won prospect as converted and link to a new Client record."""
    prospect = db.query(Prospect).filter(
        Prospect.id == prospect_id,
        Prospect.advisor_id == advisor_id,
    ).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    if prospect.stage != ProspectStageEnum.won:
        raise HTTPException(status_code=400, detail="Only Won prospects can be converted")
    if prospect.converted_client_id:
        raise HTTPException(status_code=400, detail="Prospect already converted")

    client = Client(
        name=prospect.name,
        age=0,
        segment="Retail",
        risk_score=5,
        risk_category="Moderate",
        advisor_id=advisor_id,
        source="prospect",
    )
    db.add(client)
    db.flush()

    prospect.converted_client_id = client.id
    prospect.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prospect)
    return prospect


@router.delete("/{prospect_id}", status_code=204)
def delete_prospect(
    prospect_id: int,
    advisor_id: int = Depends(_get_advisor_id),
    db: Session = Depends(get_db),
):
    from fastapi.responses import Response
    prospect = db.query(Prospect).filter(
        Prospect.id == prospect_id,
        Prospect.advisor_id == advisor_id,
    ).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    db.delete(prospect)
    db.commit()
    return Response(status_code=204)
