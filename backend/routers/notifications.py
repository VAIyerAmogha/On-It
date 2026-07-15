from fastapi import APIRouter, Depends
from db import get_db

from helpers.auth_dep import get_current_user_id
from helpers.notifications import get_notifications
from helpers.state_machine import run_pending_checks

router = APIRouter()

@router.get("")
@router.get("/")
async def list_notifications(freelancer_id: str = Depends(get_current_user_id)):
    """
    Get all current notifications for the logged-in freelancer,
    sorted by urgency.
    """
    db = get_db()
    # Run pending checks synchronously to update overdue milestone states
    run_pending_checks(db, freelancer_id)
    
    notifications = get_notifications(freelancer_id)
    return {
        "notifications": notifications,
        "count": len(notifications)
    }
