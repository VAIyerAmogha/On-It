from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

VALID_TRANSITIONS = {
    "PENDING": ["TRIGGERED"],
    "TRIGGERED": ["INVOICED"],
    "INVOICED": ["PAID", "OVERDUE"],
    "OVERDUE": ["PAID"],
}

class InvalidTransitionError(Exception):
    pass

def transition_milestone(db, milestone_id: str, to_status: str, actor: str, extra_fields: Optional[dict] = None) -> dict:
    if actor not in ("system", "user"):
        raise ValueError(f"Invalid actor '{actor}'. Must be 'system' or 'user'.")

    try:
        query_id = ObjectId(milestone_id)
    except Exception:
        query_id = milestone_id

    milestone = db.milestones.find_one({"_id": query_id})
    if not milestone:
        raise InvalidTransitionError(f"Milestone {milestone_id} not found.")

    current = milestone["status"]
    
    if to_status not in VALID_TRANSITIONS.get(current, []):
        raise InvalidTransitionError(f"Cannot transition from '{current}' to '{to_status}'.")

    now = datetime.now(timezone.utc)
    
    update_data = {
        "status": to_status,
        "updated_at": now
    }
    if extra_fields:
        update_data.update(extra_fields)
        
    db.milestones.update_one({"_id": query_id}, {"$set": update_data})
    
    audit_entry = {
        "milestone_id": query_id,
        "timestamp": now,
        "actor": actor,
        "previous_state": current,
        "new_state": to_status
    }
    db.milestone_events.insert_one(audit_entry)
    
    return db.milestones.find_one({"_id": query_id})

def mark_invoiced(db, milestone_id: str, invoice_number: str, due_date: str, sent_at: Optional[str] = None) -> dict:
    extra_fields = {
        "invoice_number": invoice_number,
        "due_date": due_date,
        "sent_at": sent_at or datetime.now(timezone.utc)
    }
    return transition_milestone(db, milestone_id, "INVOICED", actor="system", extra_fields=extra_fields)

import logging

def mark_paid(db, milestone_id: str, paid_date: Optional[str] = None) -> dict:
    try:
        query_id = ObjectId(milestone_id)
    except Exception:
        query_id = milestone_id

    milestone = db.milestones.find_one({"_id": query_id})
    if not milestone:
        raise InvalidTransitionError(f"Milestone {milestone_id} not found.")

    if not paid_date:
        paid_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    payment_lag_days = None
    sent_at = milestone.get("sent_at")
    
    if sent_at:
        try:
            if isinstance(sent_at, str):
                sent_at_date = datetime.fromisoformat(sent_at.replace("Z", "+00:00")).date()
            elif isinstance(sent_at, datetime):
                sent_at_date = sent_at.date()
            else:
                sent_at_date = None

            if sent_at_date:
                paid_date_obj = datetime.strptime(paid_date, "%Y-%m-%d").date()
                payment_lag_days = (paid_date_obj - sent_at_date).days
        except Exception as e:
            logging.warning(f"Failed to calculate payment_lag_days: {e}")

    updated = transition_milestone(
        db, 
        milestone_id, 
        "PAID", 
        actor="user", 
        extra_fields={"paid_date": paid_date, "payment_lag_days": payment_lag_days}
    )

    if milestone.get("trigger_type") == "recurring":
        new_ms = milestone.copy()
        new_ms.pop("_id", None)
        new_ms["status"] = "PENDING"
        new_ms["milestone_number"] = milestone.get("milestone_number", 1) + 1
        new_ms["created_at"] = datetime.now(timezone.utc)
        new_ms["updated_at"] = datetime.now(timezone.utc)
        new_ms.pop("invoice_number", None)
        new_ms.pop("due_date", None)
        new_ms.pop("sent_at", None)
        new_ms.pop("paid_date", None)
        new_ms.pop("payment_lag_days", None)
        
        td = milestone.get("trigger_date")
        if td:
            try:
                dt = datetime.strptime(td, "%Y-%m-%d")
                import calendar
                from datetime import timedelta
                days_in_month = calendar.monthrange(dt.year, dt.month)[1]
                next_dt = dt + timedelta(days=days_in_month)
                new_ms["trigger_date"] = next_dt.strftime("%Y-%m-%d")
            except Exception:
                pass
                
        db.milestones.insert_one(new_ms)

    return {
        "milestone": updated
    }

def run_pending_checks(db, freelancer_id: str) -> dict:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    stats = {
        "overdue_marked": 0,
        "followups_sent": 0
    }
        
    overdue_milestones = db.milestones.find({
        "freelancer_id": freelancer_id,
        "status": "INVOICED",
        "due_date": {"$lt": today_str}
    })
    for m in overdue_milestones:
        transition_milestone(db, str(m["_id"]), "OVERDUE", actor="system")
        stats["overdue_marked"] += 1

    return stats


