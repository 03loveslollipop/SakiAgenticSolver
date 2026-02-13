"""Core diagnostics/admin utility endpoints."""

from __future__ import annotations

import logging
import os

from fastapi import APIRouter

from services.email_service import EmailService
from shared.db import mask_mongodb_url
from database.mongodb import DATABASE_NAME, MONGODB_URL

logger = logging.getLogger(__name__)

router = APIRouter(tags=["diagnostics"])


@router.get("/debug/mongodb-config")
async def debug_mongodb_config():
    env_vars = {
        "MONGODB_URL": "SET" if os.getenv("MONGODB_URL") else "NOT SET",
        "NF_SAKI_DB_MONGO_SRV": "SET" if os.getenv("NF_SAKI_DB_MONGO_SRV") else "NOT SET",
        "NF_SAKI_DB_DATABASE": os.getenv("NF_SAKI_DB_DATABASE", "NOT SET"),
        "NF_SAKI_DB_HOST": "SET" if os.getenv("NF_SAKI_DB_HOST") else "NOT SET",
        "NF_SAKI_DB_USERNAME": "SET" if os.getenv("NF_SAKI_DB_USERNAME") else "NOT SET",
        "NF_SAKI_DB_PASSWORD": "SET" if os.getenv("NF_SAKI_DB_PASSWORD") else "NOT SET",
        "DATABASE": os.getenv("DATABASE", "NOT SET"),
        "DATABASE_NAME": os.getenv("DATABASE_NAME", "NOT SET"),
    }

    return {
        "detected_database_name": DATABASE_NAME,
        "mongodb_url_masked": mask_mongodb_url(MONGODB_URL),
        "environment_variables": env_vars,
    }


@router.post("/debug/send-test-email")
async def send_test_email(email: str = "quizgamer234@gmail.com"):
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    if not smtp_user or not smtp_password:
        return {
            "status": "error",
            "message": "SMTP credentials not configured",
            "details": {
                "SMTP_USER": "SET" if smtp_user else "NOT SET",
                "SMTP_PASSWORD": "SET" if smtp_password else "NOT SET",
            },
        }

    try:
        email_service = EmailService()
        success = await email_service.send_welcome_email(
            to_email=email,
            username=email,
            temporary_password="TempPass123!@#",
            locale="en",
        )

        if success:
            return {
                "status": "success",
                "message": f"Test email sent to {email}",
                "details": {
                    "to_email": email,
                    "username": email,
                    "temporary_password": "TempPass123!@#",
                    "from": f"{email_service.smtp_from_name} <{email_service.smtp_from}>",
                },
            }

        return {
            "status": "error",
            "message": f"Failed to send email to {email}",
            "details": "Check logs for error details",
        }
    except Exception as exc:
        logger.error("Error sending test email: %s", exc, exc_info=True)
        return {
            "status": "error",
            "message": f"Error sending email: {str(exc)}",
            "details": str(exc),
        }

