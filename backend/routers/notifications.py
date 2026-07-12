from fastapi import APIRouter, Depends
from db import get_db

try:
    from lib.auth_dep import get_current_user_id
    from lib.notifications import get_notifications
except ImportError:
    from backend.lib.auth_dep import get_current_user_id
    from backend.lib.notifications import get_notifications

router = APIRouter()

@router.get("")
@router.get("/")
async def list_notifications(freelancer_id: str = Depends(get_current_user_id)):
    """
    Get all current notifications for the logged-in freelancer,
    sorted by urgency.
    """
    notifications = get_notifications(freelancer_id)
    return {
        "notifications": notifications,
        "count": len(notifications)
    }
