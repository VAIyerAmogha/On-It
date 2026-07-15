from datetime import datetime, date, timedelta, timezone
from bson import ObjectId
from typing import Any

from db import get_db

def get_notifications(freelancer_id: str) -> list[dict]:
    """
    Retrieve and prioritize notifications for a freelancer.
    Runs four targeted Mongo queries to find overdue payments, upcoming due payments,
    upcoming deadlines, and uninvoiced triggered milestones.
    """
    db = get_db()
    
    # Helper to convert date/datetime to YYYY-MM-DD string
    def to_date_str(val: Any) -> str | None:
        if val is None:
            return None
        if isinstance(val, (datetime, date)):
            return val.strftime("%Y-%m-%d")
        if isinstance(val, str):
            return val[:10]
        return str(val)[:10]

    # Helper to parse date/datetime to date object for comparison/math
    def to_date_obj(val: Any) -> date | None:
        if val is None:
            return None
        if isinstance(val, datetime):
            return val.date()
        if isinstance(val, date):
            return val
        if isinstance(val, str):
            try:
                return datetime.strptime(val[:10], "%Y-%m-%d").date()
            except ValueError:
                return None
        return None

    today = datetime.now(timezone.utc).date()
    today_str = today.strftime("%Y-%m-%d")
    
    # -------------------------------------------------------------------------
    # Query A — OVERDUE_PAYMENT:
    # Find all milestones with status "OVERDUE" for this freelancer.
    # Join to invoices (by milestone_id) to get invoice amount and due_date.
    # Join to contracts (by contract_id) to get client_name and contract title.
    # -------------------------------------------------------------------------
    overdue_milestones = list(db.milestones.find({
        "freelancer_id": freelancer_id,
        "status": "OVERDUE"
    }))
    
    list_a = []
    for m in overdue_milestones:
        m_id = str(m["_id"])
        contract_id = str(m.get("contract_id", ""))
        
        # Join to invoices
        invoice = db.invoices.find_one({
            "milestone_id": m_id,
            "freelancer_id": freelancer_id
        })
        
        # Join to contracts
        contract = None
        if contract_id:
            try:
                contract = db.contracts.find_one({
                    "_id": ObjectId(contract_id),
                    "freelancer_id": freelancer_id
                })
            except Exception:
                pass
                
        client_name = ""
        contract_title = "Unknown Contract"
        if contract:
            client_name = contract.get("client_name") or (contract.get("client_contact") or {}).get("name") or ""
            contract_title = contract.get("title") or contract.get("project_name") or "Untitled Project"
            
        invoice_amount = None
        due_date_str = None
        if invoice:
            invoice_amount = invoice.get("total_amount")
            due_date_str = to_date_str(invoice.get("due_date"))
        else:
            invoice_amount = m.get("amount_inr")
            due_date_str = to_date_str(m.get("due_date"))
            
        due_date_obj = to_date_obj(due_date_str)
        days_overdue = None
        if due_date_obj:
            days_overdue = (today - due_date_obj).days
            if days_overdue < 0:
                days_overdue = 0
                
        list_a.append({
            "type": "OVERDUE_PAYMENT",
            "milestone_id": m_id,
            "contract_id": contract_id,
            "contract_title": contract_title,
            "client_name": client_name,
            "milestone_number": m.get("milestone_number"),
            "deliverable_description": m.get("deliverable_description"),
            "amount_inr": float(invoice_amount) if invoice_amount is not None else None,
            "due_date": due_date_str,
            "trigger_date": to_date_str(m.get("trigger_date")),
            "days_overdue": days_overdue,
            "days_until_due": None,
            "days_until_deadline": None,
            "days_since_triggered": None
        })

    # -------------------------------------------------------------------------
    # Query B — PAYMENT_DUE_SOON:
    # Find all invoices for this freelancer where due_date is between today
    # and today + 3 days (inclusive) and paid_at is null.
    # Join to milestones (by milestone_id) and contracts (by contract_id) for context.
    # -------------------------------------------------------------------------
    today_plus_3 = today + timedelta(days=3)
    today_plus_3_str = today_plus_3.strftime("%Y-%m-%d")
    
    invoices_due_soon = list(db.invoices.find({
        "freelancer_id": freelancer_id,
        "due_date": {
            "$gte": today_str,
            "$lte": today_plus_3_str
        },
        "$or": [
            {"paid_at": None},
            {"paid_at": {"$exists": False}}
        ]
    }))
    
    list_b = []
    for inv in invoices_due_soon:
        m_id = str(inv.get("milestone_id", ""))
        contract_id = str(inv.get("contract_id", ""))
        
        # Join to milestones
        milestone = None
        if m_id:
            try:
                milestone = db.milestones.find_one({
                    "_id": ObjectId(m_id),
                    "freelancer_id": freelancer_id
                })
            except Exception:
                pass
                
        # If milestone has already been transitioned to PAID, skip it
        if milestone and milestone.get("status") == "PAID":
            continue
            
        # Join to contracts
        contract = None
        if contract_id:
            try:
                contract = db.contracts.find_one({
                    "_id": ObjectId(contract_id),
                    "freelancer_id": freelancer_id
                })
            except Exception:
                pass
                
        client_name = ""
        contract_title = "Unknown Contract"
        if contract:
            client_name = contract.get("client_name") or (contract.get("client_contact") or {}).get("name") or ""
            contract_title = contract.get("title") or contract.get("project_name") or "Untitled Project"
            
        due_date_str = to_date_str(inv.get("due_date"))
        due_date_obj = to_date_obj(due_date_str)
        days_until_due = None
        if due_date_obj:
            days_until_due = (due_date_obj - today).days
            
        list_b.append({
            "type": "PAYMENT_DUE_SOON",
            "milestone_id": m_id,
            "contract_id": contract_id,
            "contract_title": contract_title,
            "client_name": client_name,
            "milestone_number": milestone.get("milestone_number") if milestone else None,
            "deliverable_description": milestone.get("deliverable_description") if milestone else None,
            "amount_inr": float(inv.get("total_amount")) if inv.get("total_amount") is not None else None,
            "due_date": due_date_str,
            "trigger_date": to_date_str(milestone.get("trigger_date")) if milestone else None,
            "days_overdue": None,
            "days_until_due": days_until_due,
            "days_until_deadline": None,
            "days_since_triggered": None
        })

    # -------------------------------------------------------------------------
    # Query C — UPCOMING_DEADLINE:
    # Find all milestones for this freelancer with status PENDING or TRIGGERED
    # and trigger_date between today and today + 7 days (inclusive).
    # Join to contracts for client_name and title.
    # -------------------------------------------------------------------------
    today_plus_7 = today + timedelta(days=7)
    today_plus_7_str = today_plus_7.strftime("%Y-%m-%d")
    
    today_dt_utc = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
    today_plus_7_dt_utc = datetime.combine(today_plus_7, datetime.max.time()).replace(tzinfo=timezone.utc)
    
    today_dt_naive = datetime.combine(today, datetime.min.time())
    today_plus_7_dt_naive = datetime.combine(today_plus_7, datetime.max.time())
    
    query_c = {
        "freelancer_id": freelancer_id,
        "status": {"$in": ["PENDING", "TRIGGERED"]},
        "$or": [
            {
                "trigger_date": {
                    "$gte": today_dt_utc,
                    "$lte": today_plus_7_dt_utc
                }
            },
            {
                "trigger_date": {
                    "$gte": today_dt_naive,
                    "$lte": today_plus_7_dt_naive
                }
            },
            {
                "trigger_date": {
                    "$gte": today_str,
                    "$lte": today_plus_7_str
                }
            }
        ]
    }
    
    upcoming_milestones = list(db.milestones.find(query_c))
    
    list_c = []
    for m in upcoming_milestones:
        m_id = str(m["_id"])
        contract_id = str(m.get("contract_id", ""))
        
        # Join to contracts
        contract = None
        if contract_id:
            try:
                contract = db.contracts.find_one({
                    "_id": ObjectId(contract_id),
                    "freelancer_id": freelancer_id
                })
            except Exception:
                pass
                
        client_name = ""
        contract_title = "Unknown Contract"
        if contract:
            client_name = contract.get("client_name") or (contract.get("client_contact") or {}).get("name") or ""
            contract_title = contract.get("title") or contract.get("project_name") or "Untitled Project"
            
        trigger_date_str = to_date_str(m.get("trigger_date"))
        trigger_date_obj = to_date_obj(trigger_date_str)
        days_until_deadline = None
        if trigger_date_obj:
            days_until_deadline = (trigger_date_obj - today).days
            
        list_c.append({
            "type": "UPCOMING_DEADLINE",
            "milestone_id": m_id,
            "contract_id": contract_id,
            "contract_title": contract_title,
            "client_name": client_name,
            "milestone_number": m.get("milestone_number"),
            "deliverable_description": m.get("deliverable_description"),
            "amount_inr": float(m.get("amount_inr")) if m.get("amount_inr") is not None else None,
            "due_date": to_date_str(m.get("due_date")),
            "trigger_date": trigger_date_str,
            "days_overdue": None,
            "days_until_due": None,
            "days_until_deadline": days_until_deadline,
            "days_since_triggered": None
        })

    # -------------------------------------------------------------------------
    # Query D — UNINVOICED_MILESTONE:
    # Find all milestones for this freelancer with status TRIGGERED and
    # updated_at older than 2 days ago (triggered > 2 days ago but still not invoiced).
    # Join to contracts for client_name and title.
    # -------------------------------------------------------------------------
    two_days_ago_dt_utc = datetime.now(timezone.utc) - timedelta(days=2)
    two_days_ago_dt_naive = datetime.now() - timedelta(days=2)
    
    query_d = {
        "freelancer_id": freelancer_id,
        "status": "TRIGGERED",
        "$or": [
            {"updated_at": {"$lt": two_days_ago_dt_utc}},
            {"updated_at": {"$lt": two_days_ago_dt_naive}}
        ]
    }
    
    uninvoiced_milestones = list(db.milestones.find(query_d))
    
    list_d = []
    for m in uninvoiced_milestones:
        m_id = str(m["_id"])
        contract_id = str(m.get("contract_id", ""))
        
        # Safety check: ensure there is no actual invoice
        invoice = db.invoices.find_one({
            "milestone_id": m_id,
            "freelancer_id": freelancer_id
        })
        if invoice:
            continue
            
        # Join to contracts
        contract = None
        if contract_id:
            try:
                contract = db.contracts.find_one({
                    "_id": ObjectId(contract_id),
                    "freelancer_id": freelancer_id
                })
            except Exception:
                pass
                
        client_name = ""
        contract_title = "Unknown Contract"
        if contract:
            client_name = contract.get("client_name") or (contract.get("client_contact") or {}).get("name") or ""
            contract_title = contract.get("title") or contract.get("project_name") or "Untitled Project"
            
        updated_at_val = m.get("updated_at")
        days_since_triggered = None
        if updated_at_val:
            updated_at_date = to_date_obj(updated_at_val)
            if updated_at_date:
                days_since_triggered = (today - updated_at_date).days
                if days_since_triggered < 0:
                    days_since_triggered = 0
                    
        list_d.append({
            "type": "UNINVOICED_MILESTONE",
            "milestone_id": m_id,
            "contract_id": contract_id,
            "contract_title": contract_title,
            "client_name": client_name,
            "milestone_number": m.get("milestone_number"),
            "deliverable_description": m.get("deliverable_description"),
            "amount_inr": float(m.get("amount_inr")) if m.get("amount_inr") is not None else None,
            "due_date": to_date_str(m.get("due_date")),
            "trigger_date": to_date_str(m.get("trigger_date")),
            "days_overdue": None,
            "days_until_due": None,
            "days_until_deadline": None,
            "days_since_triggered": days_since_triggered
        })

    # -------------------------------------------------------------------------
    # Query E — DELIVERY_REMINDER (UPCOMING_DEADLINE delivery):
    # Find all milestones for this freelancer where:
    # - trigger_date is between today and today + 7 days (inclusive)
    # - status is PENDING or TRIGGERED
    # - trigger_type is NOT "recurring"
    # - trigger_date is NOT null
    # Join to contracts for client_name and title.
    # -------------------------------------------------------------------------
    query_e = {
        "freelancer_id": freelancer_id,
        "status": {"$in": ["PENDING", "TRIGGERED"]},
        "trigger_type": {"$ne": "recurring"},
        "trigger_date": {"$ne": None},
        "$or": [
            {
                "trigger_date": {
                    "$gte": today_dt_utc,
                    "$lte": today_plus_7_dt_utc
                }
            },
            {
                "trigger_date": {
                    "$gte": today_dt_naive,
                    "$lte": today_plus_7_dt_naive
                }
            },
            {
                "trigger_date": {
                    "$gte": today_str,
                    "$lte": today_plus_7_str
                }
            }
        ]
    }
    
    delivery_reminders = list(db.milestones.find(query_e))
    
    list_e = []
    for m in delivery_reminders:
        m_id = str(m["_id"])
        contract_id = str(m.get("contract_id", ""))
        
        # Join to contracts
        contract = None
        if contract_id:
            try:
                contract = db.contracts.find_one({
                    "_id": ObjectId(contract_id),
                    "freelancer_id": freelancer_id
                })
            except Exception:
                pass
                
        client_name = ""
        contract_title = "Unknown Contract"
        if contract:
            client_name = contract.get("client_name") or (contract.get("client_contact") or {}).get("name") or ""
            contract_title = contract.get("title") or contract.get("project_name") or "Untitled Project"
            
        trigger_date_str = to_date_str(m.get("trigger_date"))
        trigger_date_obj = to_date_obj(trigger_date_str)
        days_until_deadline = None
        if trigger_date_obj:
            days_until_deadline = (trigger_date_obj - today).days
            
        list_e.append({
            "type": "DELIVERY_REMINDER",
            "milestone_id": m_id,
            "contract_id": contract_id,
            "contract_title": contract_title,
            "client_name": client_name,
            "milestone_number": m.get("milestone_number"),
            "deliverable_description": m.get("deliverable_description"),
            "amount_inr": float(m.get("amount_inr")) if m.get("amount_inr") is not None else None,
            "trigger_date": trigger_date_str,
            "days_until_deadline": days_until_deadline,
            "days_overdue": None,
            "days_since_triggered": None
        })

    # -------------------------------------------------------------------------
    # Query F — MISSED_DELIVERY:
    # Find all milestones for this freelancer where:
    # - trigger_date < today (in the past)
    # - status is PENDING (never acted on)
    # - trigger_type is NOT "recurring"
    # - trigger_date is NOT null
    # Join to contracts for client_name and title.
    # -------------------------------------------------------------------------
    query_f = {
        "freelancer_id": freelancer_id,
        "status": "PENDING",
        "trigger_type": {"$ne": "recurring"},
        "trigger_date": {"$ne": None},
        "$or": [
            {"trigger_date": {"$lt": today_dt_utc}},
            {"trigger_date": {"$lt": today_dt_naive}},
            {"trigger_date": {"$lt": today_str}}
        ]
    }
    
    missed_deliveries = list(db.milestones.find(query_f))
    
    list_f = []
    for m in missed_deliveries:
        m_id = str(m["_id"])
        contract_id = str(m.get("contract_id", ""))
        
        # Join to contracts
        contract = None
        if contract_id:
            try:
                contract = db.contracts.find_one({
                    "_id": ObjectId(contract_id),
                    "freelancer_id": freelancer_id
                })
            except Exception:
                pass
                
        client_name = ""
        contract_title = "Unknown Contract"
        if contract:
            client_name = contract.get("client_name") or (contract.get("client_contact") or {}).get("name") or ""
            contract_title = contract.get("title") or contract.get("project_name") or "Untitled Project"
            
        trigger_date_str = to_date_str(m.get("trigger_date"))
        trigger_date_obj = to_date_obj(trigger_date_str)
        days_overdue = None
        if trigger_date_obj:
            days_overdue = (today - trigger_date_obj).days
            if days_overdue < 0:
                days_overdue = 0
                
        list_f.append({
            "type": "MISSED_DELIVERY",
            "milestone_id": m_id,
            "contract_id": contract_id,
            "contract_title": contract_title,
            "client_name": client_name,
            "milestone_number": m.get("milestone_number"),
            "deliverable_description": m.get("deliverable_description"),
            "amount_inr": float(m.get("amount_inr")) if m.get("amount_inr") is not None else None,
            "trigger_date": trigger_date_str,
            "days_until_deadline": None,
            "days_overdue": days_overdue,
            "days_since_triggered": None
        })

    # -------------------------------------------------------------------------
    # Query G — UNINVOICED_TRIGGERED:
    # Find all milestones for this freelancer where:
    # - trigger_date < today (in the past)
    # - status is TRIGGERED
    # - No invoice document exists with this milestone_id
    # - trigger_type is NOT "recurring"
    # - trigger_date is NOT null
    # Join to contracts for client_name and title.
    # -------------------------------------------------------------------------
    query_g = {
        "freelancer_id": freelancer_id,
        "status": "TRIGGERED",
        "trigger_type": {"$ne": "recurring"},
        "trigger_date": {"$ne": None},
        "$or": [
            {"trigger_date": {"$lt": today_dt_utc}},
            {"trigger_date": {"$lt": today_dt_naive}},
            {"trigger_date": {"$lt": today_str}}
        ]
    }
    
    uninvoiced_triggered = list(db.milestones.find(query_g))
    
    list_g = []
    for m in uninvoiced_triggered:
        m_id = str(m["_id"])
        
        # Check if an invoice already exists for this milestone
        invoice = db.invoices.find_one({
            "milestone_id": m_id,
            "freelancer_id": freelancer_id
        })
        if invoice:
            continue
            
        contract_id = str(m.get("contract_id", ""))
        
        # Join to contracts
        contract = None
        if contract_id:
            try:
                contract = db.contracts.find_one({
                    "_id": ObjectId(contract_id),
                    "freelancer_id": freelancer_id
                })
            except Exception:
                pass
                
        client_name = ""
        contract_title = "Unknown Contract"
        if contract:
            client_name = contract.get("client_name") or (contract.get("client_contact") or {}).get("name") or ""
            contract_title = contract.get("title") or contract.get("project_name") or "Untitled Project"
            
        trigger_date_str = to_date_str(m.get("trigger_date"))
        trigger_date_obj = to_date_obj(trigger_date_str)
        days_since_triggered = None
        if trigger_date_obj:
            days_since_triggered = (today - trigger_date_obj).days
            if days_since_triggered < 0:
                days_since_triggered = 0
                
        list_g.append({
            "type": "UNINVOICED_TRIGGERED",
            "milestone_id": m_id,
            "contract_id": contract_id,
            "contract_title": contract_title,
            "client_name": client_name,
            "milestone_number": m.get("milestone_number"),
            "deliverable_description": m.get("deliverable_description"),
            "amount_inr": float(m.get("amount_inr")) if m.get("amount_inr") is not None else None,
            "trigger_date": trigger_date_str,
            "days_until_deadline": None,
            "days_overdue": None,
            "days_since_triggered": days_since_triggered
        })

    # Sort each category individually by urgency
    list_a.sort(key=lambda x: x["days_overdue"] if x["days_overdue"] is not None else 0, reverse=True)
    list_b.sort(key=lambda x: x["days_until_due"] if x["days_until_due"] is not None else float('inf'))
    list_c.sort(key=lambda x: x["days_until_deadline"] if x["days_until_deadline"] is not None else float('inf'))
    list_d.sort(key=lambda x: x["days_since_triggered"] if x["days_since_triggered"] is not None else 0, reverse=True)
    list_e.sort(key=lambda x: x["days_until_deadline"] if x["days_until_deadline"] is not None else float('inf'))
    list_f.sort(key=lambda x: x["days_overdue"] if x["days_overdue"] is not None else 0, reverse=True)
    list_g.sort(key=lambda x: x["days_since_triggered"] if x["days_since_triggered"] is not None else 0, reverse=True)
    
    # Concatenate in order of urgency types:
    # 1. MISSED_DELIVERY (list_f)
    # 2. OVERDUE_PAYMENT (list_a)
    # 3. PAYMENT_DUE_SOON (list_b)
    # 4. UNINVOICED_TRIGGERED (list_g)
    # 5. DELIVERY_REMINDER/UPCOMING_DEADLINE (list_e, list_c)
    # 6. UNINVOICED_MILESTONE (list_d)
    return list_f + list_a + list_b + list_g + list_e + list_c + list_d
