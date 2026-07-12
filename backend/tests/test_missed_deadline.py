import sys
import os
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.invoice_gen import build_invoice_data, create_invoice
from db import get_db
from main import app
from jose import jwt

def test_build_invoice_data_with_discount():
    db = get_db()
    
    freelancer_oid = ObjectId()
    freelancer_id = str(freelancer_oid)
    
    # Clean up
    db.profiles.delete_many({"_id": freelancer_oid})
    db.contracts.delete_many({"freelancer_id": freelancer_id})
    db.milestones.delete_many({"freelancer_id": freelancer_id})
    db.invoices.delete_many({"freelancer_id": freelancer_id})
    
    try:
        db.profiles.insert_one({
            "_id": freelancer_oid,
            "email": "test_discount@example.com",
            "name": "Test Freelancer",
            "default_gst_rate": 0.18,
            "invoice_prefix": "INV",
            "invoice_counter": 1
        })
        
        contract_oid = ObjectId()
        db.contracts.insert_one({
            "_id": contract_oid,
            "freelancer_id": freelancer_id,
            "client_name": "Test Client",
            "title": "Test Contract",
            "payment_terms_days": 10,
            "contract_date": datetime.now(timezone.utc)
        })
        
        milestone_oid = ObjectId()
        db.milestones.insert_one({
            "_id": milestone_oid,
            "contract_id": str(contract_oid),
            "freelancer_id": freelancer_id,
            "milestone_number": 1,
            "trigger_type": "event_based",
            "status": "TRIGGERED",
            "amount_inr": 10000.0,
            "deliverable_description": "Milestone 1 Description",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
        
        # Test normal build_invoice_data
        data_normal = build_invoice_data(db, str(milestone_oid))
        assert data_normal["line_item"]["amount_before_gst"] == 10000.0
        assert data_normal["gst_amount"] == 1800.0
        assert data_normal["total_amount"] == 11800.0
        assert "delivery_missed" not in data_normal
        
        # Test build_invoice_data with delivery_missed and discount
        data_discounted = build_invoice_data(db, str(milestone_oid), delivery_missed=True, discount_percentage=10.0)
        assert data_discounted["delivery_missed"] is True
        assert data_discounted["discount_percentage"] == 10.0
        assert data_discounted["discount_amount"] == 1000.0
        assert data_discounted["original_amount_inr"] == 10000.0
        assert data_discounted["amount_before_gst"] == 9000.0
        assert data_discounted["gst_amount"] == 1620.0
        assert data_discounted["total_amount"] == 10620.0
        
    finally:
        db.profiles.delete_many({"_id": freelancer_oid})
        db.contracts.delete_many({"freelancer_id": freelancer_id})
        db.milestones.delete_many({"freelancer_id": freelancer_id})
        db.invoices.delete_many({"freelancer_id": freelancer_id})

def test_create_invoice_with_discount():
    db = get_db()
    
    freelancer_oid = ObjectId()
    freelancer_id = str(freelancer_oid)
    
    # Clean up
    db.profiles.delete_many({"_id": freelancer_oid})
    db.contracts.delete_many({"freelancer_id": freelancer_id})
    db.milestones.delete_many({"freelancer_id": freelancer_id})
    db.invoices.delete_many({"freelancer_id": freelancer_id})
    
    try:
        db.profiles.insert_one({
            "_id": freelancer_oid,
            "email": "test_discount@example.com",
            "name": "Test Freelancer",
            "default_gst_rate": 0.18,
            "invoice_prefix": "INV",
            "invoice_counter": 1
        })
        
        contract_oid = ObjectId()
        db.contracts.insert_one({
            "_id": contract_oid,
            "freelancer_id": freelancer_id,
            "client_name": "Test Client",
            "title": "Test Contract",
            "payment_terms_days": 10,
            "contract_date": datetime.now(timezone.utc)
        })
        
        milestone_oid = ObjectId()
        db.milestones.insert_one({
            "_id": milestone_oid,
            "contract_id": str(contract_oid),
            "freelancer_id": freelancer_id,
            "milestone_number": 1,
            "trigger_type": "event_based",
            "status": "TRIGGERED",
            "amount_inr": 10000.0,
            "deliverable_description": "Milestone 1 Description",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
        
        # Call create_invoice with discount
        invoice_doc = create_invoice(db, str(milestone_oid), delivery_missed=True, discount_percentage=15.5)
        
        assert invoice_doc["delivery_missed"] is True
        assert invoice_doc["discount_percentage"] == 15.5
        assert invoice_doc["discount_amount"] == 1550.0
        assert invoice_doc["original_amount_inr"] == 10000.0
        assert invoice_doc["amount_before_gst"] == 8450.0
        assert invoice_doc["gst_amount"] == round(8450.0 * 0.18, 2)
        assert invoice_doc["total_amount"] == round(8450.0 * 1.18, 2)
        
        # Verify stored in DB
        db_doc = db.invoices.find_one({"_id": invoice_doc["_id"]})
        assert db_doc is not None
        assert db_doc["delivery_missed"] is True
        assert db_doc["discount_percentage"] == 15.5
        assert db_doc["discount_amount"] == 1550.0
        assert db_doc["original_amount_inr"] == 10000.0
        assert db_doc["amount_before_gst"] == 8450.0
        
        # Verify milestone transition to INVOICED
        milestone = db.milestones.find_one({"_id": milestone_oid})
        assert milestone["status"] == "INVOICED"
        
    finally:
        db.profiles.delete_many({"_id": freelancer_oid})
        db.contracts.delete_many({"freelancer_id": freelancer_id})
        db.milestones.delete_many({"freelancer_id": freelancer_id})
        db.invoices.delete_many({"freelancer_id": freelancer_id})

def test_invoice_missed_deadline_endpoint():
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
        "name": "Endpoint Test User",
        "default_gst_rate": 0.18,
        "invoice_prefix": "INV",
        "invoice_counter": 1
    })
    
    jwt_secret = os.getenv("JWT_SECRET", "test_secret_key")
    os.environ["JWT_SECRET"] = jwt_secret
    token = jwt.encode({"sub": freelancer_id}, jwt_secret, algorithm="HS256")
    
    try:
        contract_oid = ObjectId()
        db.contracts.insert_one({
            "_id": contract_oid,
            "freelancer_id": freelancer_id,
            "client_name": "Client Endpoint",
            "title": "Contract Endpoint"
        })
        
        milestone_oid = ObjectId()
        db.milestones.insert_one({
            "_id": milestone_oid,
            "contract_id": str(contract_oid),
            "freelancer_id": freelancer_id,
            "milestone_number": 1,
            "trigger_type": "event_based",
            "status": "TRIGGERED",
            "amount_inr": 5000.0,
            "deliverable_description": "Milestone description",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
        
        client = TestClient(app)
        
        # Test validation error (<= 0)
        resp = client.post(
            f"/api/milestones/{str(milestone_oid)}/invoice-missed-deadline",
            headers={"Authorization": f"Bearer {token}"},
            json={"discount_percentage": 0.0}
        )
        assert resp.status_code == 422
        
        # Test validation error (> 100)
        resp = client.post(
            f"/api/milestones/{str(milestone_oid)}/invoice-missed-deadline",
            headers={"Authorization": f"Bearer {token}"},
            json={"discount_percentage": 100.1}
        )
        assert resp.status_code == 422
        
        # Test correct invoice creation
        resp = client.post(
            f"/api/milestones/{str(milestone_oid)}/invoice-missed-deadline",
            headers={"Authorization": f"Bearer {token}"},
            json={"discount_percentage": 10.0}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["delivery_missed"] is True
        assert data["discount_percentage"] == 10.0
        assert data["discount_amount"] == 500.0
        assert data["original_amount_inr"] == 5000.0
        assert data["amount_before_gst"] == 4500.0
        
        # Verify milestone is invoiced
        milestone = db.milestones.find_one({"_id": milestone_oid})
        assert milestone["status"] == "INVOICED"
        
    finally:
        db.profiles.delete_many({"_id": freelancer_oid})
        db.contracts.delete_many({"freelancer_id": freelancer_id})
        db.milestones.delete_many({"freelancer_id": freelancer_id})
        db.invoices.delete_many({"freelancer_id": freelancer_id})
