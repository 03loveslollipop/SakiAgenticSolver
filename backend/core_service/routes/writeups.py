"""Core-owned writeup query endpoints."""

from __future__ import annotations

from typing import Optional
import logging

from fastapi import APIRouter, HTTPException, status

from shared.services import get_writeup_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/writeups", tags=["writeups"])


@router.get("/search")
async def search_writeups(q: Optional[str] = None, challenge_type: Optional[str] = None):
    """
    Search writeups by keywords and/or challenge type.
    """
    if not q and not challenge_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of 'q' or 'challenge_type' parameter is required",
        )

    writeup_manager = get_writeup_manager()
    writeups = await writeup_manager.search_writeups(query=q, challenge_type=challenge_type)

    writeup_list = [
        {
            "id": w.id,
            "session_id": w.session_id,
            "challenge_urls": w.challenge_urls,
            "challenge_type": w.challenge_type,
            "completion_timestamp": w.completion_timestamp.isoformat(),
            "agent_type": w.agent_type,
            "agent_model": w.agent_model,
            "content_preview": w.content[:200] + "..." if len(w.content) > 200 else w.content,
        }
        for w in writeups
    ]

    return {
        "writeups": writeup_list,
        "query": q,
        "challenge_type": challenge_type,
        "count": len(writeup_list),
    }


@router.get("")
async def list_writeups(skip: int = 0, limit: int = 20):
    """
    List writeups with pagination.
    """
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="skip parameter must be non-negative",
        )
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit parameter must be between 1 and 100",
        )

    writeup_manager = get_writeup_manager()
    writeups = await writeup_manager.list_writeups(skip=skip, limit=limit)

    writeup_list = [
        {
            "id": w.id,
            "session_id": w.session_id,
            "challenge_urls": w.challenge_urls,
            "challenge_type": w.challenge_type,
            "completion_timestamp": w.completion_timestamp.isoformat(),
            "agent_type": w.agent_type,
            "agent_model": w.agent_model,
            "content_preview": w.content[:200] + "..." if len(w.content) > 200 else w.content,
        }
        for w in writeups
    ]

    return {
        "writeups": writeup_list,
        "skip": skip,
        "limit": limit,
        "count": len(writeup_list),
    }


@router.get("/{session_id}")
async def get_writeup_by_session(session_id: str):
    """
    Retrieve full writeup by session ID.
    """
    writeup_manager = get_writeup_manager()
    writeup = await writeup_manager.get_writeup(session_id)

    if not writeup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Writeup not found for session {session_id}",
        )

    return {
        "id": writeup.id,
        "session_id": writeup.session_id,
        "challenge_urls": writeup.challenge_urls,
        "challenge_type": writeup.challenge_type,
        "content": writeup.content,
        "completion_timestamp": writeup.completion_timestamp.isoformat(),
        "agent_type": writeup.agent_type,
        "agent_model": writeup.agent_model,
    }

