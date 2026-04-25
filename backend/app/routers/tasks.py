from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta

from ..database import get_db
from ..models import AdvisorTask, TaskStatusEnum
from ..schemas import TaskCreate, TaskUpdate, TaskOut
from ..auth import get_current_advisor_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskOut])
def list_tasks(
    status: Optional[str] = None,
    due_within_days: Optional[int] = None,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    q = db.query(AdvisorTask).filter(AdvisorTask.advisor_id == current_advisor.id)
    if status:
        try:
            q = q.filter(AdvisorTask.status == TaskStatusEnum(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    if due_within_days is not None:
        cutoff = date.today() + timedelta(days=due_within_days)
        q = q.filter(AdvisorTask.due_date <= cutoff)
    return q.order_by(AdvisorTask.due_date.asc().nullslast()).all()


@router.post("", response_model=TaskOut, status_code=201)
def create_task(
    payload: TaskCreate,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    task = AdvisorTask(
        advisor_id=current_advisor.id,
        client_id=payload.client_id,
        prospect_id=payload.prospect_id,
        title=payload.title,
        due_date=payload.due_date,
        linked_workflow=payload.linked_workflow,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/summary", response_model=dict)
def task_summary(
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    """Return counts for workspace KPI: pending total, due within 7 days."""
    today = date.today()
    cutoff_7d = today + timedelta(days=7)
    total_pending = (
        db.query(AdvisorTask)
        .filter(
            AdvisorTask.advisor_id == current_advisor.id,
            AdvisorTask.status == TaskStatusEnum.pending,
        )
        .count()
    )
    due_7d = (
        db.query(AdvisorTask)
        .filter(
            AdvisorTask.advisor_id == current_advisor.id,
            AdvisorTask.status == TaskStatusEnum.pending,
            AdvisorTask.due_date <= cutoff_7d,
        )
        .count()
    )
    return {"total_pending": total_pending, "due_within_7d": due_7d}


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    task = db.query(AdvisorTask).filter(
        AdvisorTask.id == task_id,
        AdvisorTask.advisor_id == current_advisor.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    task = db.query(AdvisorTask).filter(
        AdvisorTask.id == task_id,
        AdvisorTask.advisor_id == current_advisor.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        if field == "status":
            try:
                val = TaskStatusEnum(val)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {val}")
        setattr(task, field, val)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/done", response_model=TaskOut)
def mark_done(
    task_id: int,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    task = db.query(AdvisorTask).filter(
        AdvisorTask.id == task_id,
        AdvisorTask.advisor_id == current_advisor.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = TaskStatusEnum.done
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    current_advisor=Depends(get_current_advisor_user),
    db: Session = Depends(get_db),
):
    from fastapi.responses import Response
    task = db.query(AdvisorTask).filter(
        AdvisorTask.id == task_id,
        AdvisorTask.advisor_id == current_advisor.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return Response(status_code=204)
