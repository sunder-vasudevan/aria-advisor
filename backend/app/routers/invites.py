import os
import uuid
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import Invitation, Advisor

router = APIRouter(prefix="/invites", tags=["invites"])


class InviteRequest(BaseModel):
    client_email: EmailStr
    client_name: Optional[str] = None


def _get_advisor_id(x_advisor_id: Optional[int] = Header(default=None)) -> int:
    if x_advisor_id is None:
        raise HTTPException(status_code=401, detail="X-Advisor-Id header required")
    return x_advisor_id


def _build_email_html(advisor_name: str, client_name: str, invite_link: str) -> str:
    greeting = f"Hi {client_name}," if client_name else "Hi,"
    return f"""
<html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
  <h2 style="color:#1e4fff;margin-bottom:8px">You've been invited to ARIA</h2>
  <p>{greeting}</p>
  <p><strong>{advisor_name}</strong> has invited you to join ARIA Personal — your private wealth dashboard.</p>
  <p>Click below to set up your account:</p>
  <a href="{invite_link}" style="display:inline-block;padding:12px 24px;background:#1e4fff;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
    Accept Invitation
  </a>
  <p style="color:#6b7280;font-size:12px;margin-top:24px">This link expires in 7 days. If you didn't expect this email, you can ignore it.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="color:#9ca3af;font-size:11px">Powered by ARIA · aria-advisor.vercel.app</p>
</body></html>
"""


async def _send_invite_email(to_email: str, to_name: str, advisor_name: str, invite_link: str):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)

    if not all([smtp_host, smtp_user, smtp_pass]):
        raise HTTPException(status_code=503, detail="Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD.")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{advisor_name} has invited you to ARIA"
    msg["From"] = smtp_from
    msg["To"] = to_email

    html_body = _build_email_html(advisor_name, to_name, invite_link)
    plain_body = f"{advisor_name} has invited you to ARIA. Accept here: {invite_link}"
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        msg,
        hostname=smtp_host,
        port=smtp_port,
        username=smtp_user,
        password=smtp_pass,
        start_tls=True,
    )


@router.post("", status_code=201)
async def send_invite(
    payload: InviteRequest,
    db: Session = Depends(get_db),
    advisor_id: int = Depends(_get_advisor_id),
):
    advisor = db.query(Advisor).filter(Advisor.id == advisor_id).first()
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")

    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=7)
    invitation = Invitation(
        advisor_id=advisor_id,
        client_email=payload.client_email,
        token=token,
        expires_at=expires_at,
    )
    db.add(invitation)
    db.commit()

    personal_app_url = os.getenv("PERSONAL_APP_URL", "https://aria-personal.vercel.app")
    invite_link = f"{personal_app_url}/register?invite={token}"

    await _send_invite_email(
        to_email=payload.client_email,
        to_name=payload.client_name or "",
        advisor_name=advisor.display_name,
        invite_link=invite_link,
    )

    return {"id": invitation.id, "client_email": payload.client_email, "expires_at": expires_at.isoformat()}


@router.get("")
def list_invites(
    db: Session = Depends(get_db),
    advisor_id: int = Depends(_get_advisor_id),
):
    invites = db.query(Invitation).filter(Invitation.advisor_id == advisor_id).order_by(Invitation.created_at.desc()).limit(50).all()
    return [
        {
            "id": i.id,
            "client_email": i.client_email,
            "used": i.used,
            "expires_at": i.expires_at.isoformat(),
            "created_at": i.created_at.isoformat(),
        }
        for i in invites
    ]
