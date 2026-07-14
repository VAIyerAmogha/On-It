import sys
import os
from datetime import datetime, timezone, timedelta
from bson import ObjectId

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.notifications import get_notifications
from db import get_db

def test_get_notifications_sorting():
    db = get_db()
    
    freelancer_oid = ObjectId()
    freelancer_id = str(freelancer_oid)
    
    # Clean up
    db.profiles.delete_many({"_id": freelancer_oid})
    db.contracts.delete_many({"freelancer_id": freelancer_id})
    db.milestones.delete_many({"freelancer_id": freelancer_id})
    db.invoices.delete_many({"freelancer_id": freelancer_id})
    
    try:
        db.profiles.insert_one({"_id": freelancer_oid, "email": "test_sort@example.com", "name": "Test"})
        
        contract_id = str(ObjectId())
        db.contracts.insert_one({
            "_id": ObjectId(contract_id),
            "freelancer_id": freelancer_id,
            "client_name": "Client",
            "title": "Contract"
        })
        
        today = datetime.now(timezone.utc).date()
        
        # 1. Two OVERDUE_PAYMENT: one overdue by 2 days, one overdue by 10 days
        # We expect the 10 days one to come first (most days overdue first)
        m1_oid = ObjectId()
        m2_oid = ObjectId()
        db.milestones.insert_many([
            {
                "_id": m1_oid, "contract_id": contract_id, "freelancer_id": freelancer_id,
                "milestone_number": 1, "trigger_type": "event_based", "status": "OVERDUE",
                "extraction_confidence": 0.9, "modified_from_contract": False,
                "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
            },
            {
                "_id": m2_oid, "contract_id": contract_id, "freelancer_id": freelancer_id,
                "milestone_number": 2, "trigger_type": "event_based", "status": "OVERDUE",
                "extraction_confidence": 0.9, "modified_from_contract": False,
                "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
            }
        ])
        db.invoices.insert_many([
            {
                "milestone_id": str(m1_oid), "contract_id": contract_id, "freelancer_id": freelancer_id,
                "invoice_number": "INV-1", "due_date": (today - timedelta(days=2)).strftime("%Y-%m-%d"),
                "total_amount": 100.0, "created_at": datetime.now(timezone.utc)
            },
            {
                "milestone_id": str(m2_oid), "contract_id": contract_id, "freelancer_id": freelancer_id,
                "invoice_number": "INV-2", "due_date": (today - timedelta(days=10)).strftime("%Y-%m-%d"),
                "total_amount": 200.0, "created_at": datetime.now(timezone.utc)
            }
        ])
        
        # 2. Two PAYMENT_DUE_SOON: one due in 3 days, one due in 1 day
        # We expect the 1 day one to come first (fewest days until due first)
        m3_oid = ObjectId()
        m4_oid = ObjectId()
        db.milestones.insert_many([
            {
                "_id": m3_oid, "contract_id": contract_id, "freelancer_id": freelancer_id,
                "milestone_number": 3, "trigger_type": "event_based", "status": "INVOICED",
                "extraction_confidence": 0.9, "modified_from_contract": False,
                "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
            },
            {
                "_id": m4_oid, "contract_id": contract_id, "freelancer_id": freelancer_id,
                "milestone_number": 4, "trigger_type": "event_based", "status": "INVOICED",
                "extraction_confidence": 0.9, "modified_from_contract": False,
                "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
            }
        ])
        db.invoices.insert_many([
            {
                "milestone_id": str(m3_oid), "contract_id": contract_id, "freelancer_id": freelancer_id,
                "invoice_number": "INV-3", "due_date": (today + timedelta(days=3)).strftime("%Y-%m-%d"),
                "total_amount": 300.0, "created_at": datetime.now(timezone.utc)
            },
            {
                "milestone_id": str(m4_oid), "contract_id": contract_id, "freelancer_id": freelancer_id,
                "invoice_number": "INV-4", "due_date": (today + timedelta(days=1)).strftime("%Y-%m-%d"),
                "total_amount": 400.0, "created_at": datetime.now(timezone.utc)
            }
        ])
        
        # 3. Two UPCOMING_DEADLINE: one due in 7 days, one due in 4 days
        # We expect the 4 days one to come first (fewest days until deadline first)
        m5_oid = ObjectId()
        m6_oid = ObjectId()
        db.milestones.insert_many([
            {
                "_id": m5_oid, "contract_id": contract_id, "freelancer_id": freelancer_id,
                "milestone_number": 5, "trigger_type": "recurring",
                "trigger_date": datetime.combine(today + timedelta(days=7), datetime.min.time()).replace(tzinfo=timezone.utc),
                "status": "PENDING", "extraction_confidence": 0.9, "modified_from_contract": False,
                "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
            },
            {
                "_id": m6_oid, "contract_id": contract_id, "freelancer_id": freelancer_id,
                "milestone_number": 6, "trigger_type": "recurring",
                "trigger_date": datetime.combine(today + timedelta(days=4), datetime.min.time()).replace(tzinfo=timezone.utc),
                "status": "PENDING", "extraction_confidence": 0.9, "modified_from_contract": False,
                "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
            }
        ])
        
        # 4. Two UNINVOICED_MILESTONE: one triggered 3 days ago, one triggered 5 days ago
        # We expect the 5 days one to come first (most days since triggered first)
        m7_oid = ObjectId()
        m8_oid = ObjectId()
        db.milestones.insert_many([
            {
                "_id": m7_oid, "contract_id": contract_id, "freelancer_id": freelancer_id,
                "milestone_number": 7, "trigger_type": "event_based", "status": "TRIGGERED",
                "extraction_confidence": 0.9, "modified_from_contract": False,
                "created_at": datetime.now(timezone.utc) - timedelta(days=10),
                "updated_at": datetime.now(timezone.utc) - timedelta(days=3)
            },
            {
                "_id": m8_oid, "contract_id": contract_id, "freelancer_id": freelancer_id,
                "milestone_number": 8, "trigger_type": "event_based", "status": "TRIGGERED",
                "extraction_confidence": 0.9, "modified_from_contract": False,
                "created_at": datetime.now(timezone.utc) - timedelta(days=10),
                "updated_at": datetime.now(timezone.utc) - timedelta(days=5)
            }
        ])
        
        notifs = get_notifications(freelancer_id)
        
        # Assert categories grouping order
        types = [n["type"] for n in notifs]
        expected_types = (
            ["OVERDUE_PAYMENT", "OVERDUE_PAYMENT"] +
            ["PAYMENT_DUE_SOON", "PAYMENT_DUE_SOON"] +
            ["UPCOMING_DEADLINE", "UPCOMING_DEADLINE"] +
            ["UNINVOICED_MILESTONE", "UNINVOICED_MILESTONE"]
        )
        assert types == expected_types
        
        # Check inner sorting:
        # OVERDUE_PAYMENT: m2 (10 days overdue) then m1 (2 days overdue)
        assert notifs[0]["milestone_id"] == str(m2_oid)
        assert notifs[1]["milestone_id"] == str(m1_oid)
        
        # PAYMENT_DUE_SOON: m4 (1 day until due) then m3 (3 days until due)
        assert notifs[2]["milestone_id"] == str(m4_oid)
        assert notifs[3]["milestone_id"] == str(m3_oid)
        
        # UPCOMING_DEADLINE: m6 (4 days until deadline) then m5 (7 days until deadline)
        assert notifs[4]["milestone_id"] == str(m6_oid)
        assert notifs[5]["milestone_id"] == str(m5_oid)
        
        # UNINVOICED_MILESTONE: m8 (5 days since triggered) then m7 (3 days since triggered)
        assert notifs[6]["milestone_id"] == str(m8_oid)
        assert notifs[7]["milestone_id"] == str(m7_oid)
        
    finally:
        db.profiles.delete_many({"_id": freelancer_oid})
        db.contracts.delete_many({"freelancer_id": freelancer_id})
        db.milestones.delete_many({"freelancer_id": freelancer_id})
        db.invoices.delete_many({"freelancer_id": freelancer_id})

def test_notifications_endpoint():
    from fastapi.testclient import TestClient
    from main import app
    from jose import jwt
    
    db = get_db()
    
    freelancer_oid = ObjectId()
    freelancer_id = str(freelancer_oid)
    
    # Clean up
    db.profiles.delete_many({"_id": freelancer_oid})
    db.contracts.delete_many({"freelancer_id": freelancer_id})
    db.milestones.delete_many({"freelancer_id": freelancer_id})
    db.invoices.delete_many({"freelancer_id": freelancer_id})
    
    # Create profile
    db.profiles.insert_one({
        "_id": freelancer_oid,
        "email": "endpoint_test@example.com",
        "name": "Endpoint Test User"
    })
    
    jwt_secret = os.getenv("JWT_SECRET", "test_secret_key")
    os.environ["JWT_SECRET"] = jwt_secret
    
    token = jwt.encode({"sub": freelancer_id}, jwt_secret, algorithm="HS256")
    
    try:
        # Create one milestone for Query D (uninvoiced triggered milestone)
        contract_oid = ObjectId()
        db.contracts.insert_one({
            "_id": contract_oid,
            "freelancer_id": freelancer_id,
            "client_name": "Client Endpoint",
            "title": "Contract Endpoint"
        })
        
        db.milestones.insert_one({
            "contract_id": str(contract_oid),
            "freelancer_id": freelancer_id,
            "milestone_number": 1,
            "trigger_type": "event_based",
            "status": "TRIGGERED",
            "amount_inr": 5000.0,
            "extraction_confidence": 0.95,
            "modified_from_contract": False,
            "created_at": datetime.now(timezone.utc) - timedelta(days=5),
            "updated_at": datetime.now(timezone.utc) - timedelta(days=3)
        })
        
        client = TestClient(app)
        response = client.get(
            "/api/notifications",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "count" in data
        assert data["count"] == 1
        assert len(data["notifications"]) == 1
        
        notif = data["notifications"][0]
        assert notif["type"] == "UNINVOICED_MILESTONE"
        assert notif["client_name"] == "Client Endpoint"
        assert notif["contract_title"] == "Contract Endpoint"
        assert notif["amount_inr"] == 5000.0
        assert notif["days_since_triggered"] == 3
        
    finally:
        db.profiles.delete_many({"_id": freelancer_oid})
        db.contracts.delete_many({"freelancer_id": freelancer_id})
        db.milestones.delete_many({"freelancer_id": freelancer_id})
        db.invoices.delete_many({"freelancer_id": freelancer_id})
