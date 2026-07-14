import sys
import os
from datetime import datetime, timezone
from bson import ObjectId
from fastapi.testclient import TestClient
from gridfs import GridFSBucket

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import get_db
from main import app
from jose import jwt
from lib.storage import save_pdf

def test_cascading_contract_deletion():
    db = get_db()
    
    freelancer_oid = ObjectId()
    freelancer_id = str(freelancer_oid)
    
    # Pre-clean
    db.profiles.delete_many({"_id": freelancer_oid})
    db.contracts.delete_many({"freelancer_id": freelancer_id})
    db.milestones.delete_many({"freelancer_id": freelancer_id})
    db.invoices.delete_many({"freelancer_id": freelancer_id})
    
    # 1. Setup mock user profile & auth token
    db.profiles.insert_one({
        "_id": freelancer_oid,
        "email": "delete_test@example.com",
        "name": "Delete Tester User"
    })
    
    jwt_secret = os.getenv("JWT_SECRET", "test_secret_key")
    os.environ["JWT_SECRET"] = jwt_secret
    token = jwt.encode({"sub": freelancer_id}, jwt_secret, algorithm="HS256")
    
    try:
        # Create a dummy pdf file on disk to upload to GridFS
        temp_pdf_path = "/tmp/dummy_test_contract.pdf"
        with open(temp_pdf_path, "wb") as f:
            f.write(b"%PDF-1.4 mock pdf data")
            
        # 2. Upload dummy contract PDF and invoice PDF to GridFS
        contract_file_id = save_pdf(db, temp_pdf_path, "test_contract.pdf", bucket_name="contracts")
        invoice_file_id = save_pdf(db, temp_pdf_path, "test_invoice.pdf", bucket_name="invoices")
        
        # Clean up temp file
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)
            
        # 3. Create Contract, Milestone, Milestone Event, Invoice, Chunk, and Followup Log
        contract_oid = ObjectId()
        contract_id = str(contract_oid)
        db.contracts.insert_one({
            "_id": contract_oid,
            "freelancer_id": freelancer_id,
            "client_name": "Delete Client",
            "title": "Delete Contract",
            "file_url": contract_file_id
        })
        
        milestone_oid = ObjectId()
        milestone_id = str(milestone_oid)
        db.milestones.insert_one({
            "_id": milestone_oid,
            "contract_id": contract_id,
            "freelancer_id": freelancer_id,
            "milestone_number": 1,
            "trigger_type": "event_based",
            "status": "TRIGGERED",
            "amount_inr": 10000.0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
        
        # Milestone event (ObjectId)
        db.milestone_events.insert_one({
            "milestone_id": milestone_oid,
            "timestamp": datetime.now(timezone.utc),
            "actor": "user",
            "previous_state": "PENDING",
            "new_state": "TRIGGERED"
        })
        
        # Milestone event (str)
        db.milestone_events.insert_one({
            "milestone_id": milestone_id,
            "timestamp": datetime.now(timezone.utc),
            "actor": "user",
            "previous_state": "PENDING",
            "new_state": "TRIGGERED"
        })
        
        invoice_oid = ObjectId()
        invoice_id = str(invoice_oid)
        db.invoices.insert_one({
            "_id": invoice_oid,
            "contract_id": contract_id,
            "milestone_id": milestone_id,
            "freelancer_id": freelancer_id,
            "invoice_number": "INV-DEL-1",
            "total_amount": 10000.0,
            "pdf_file_id": invoice_file_id,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Followup log
        db.followup_logs.insert_one({
            "invoice_id": invoice_id,
            "timestamp": datetime.now(timezone.utc),
            "action": "sent_email",
            "recipient": "client@delete.com"
        })
        
        # Contract chunk (RAG data)
        db.contract_chunks.insert_one({
            "contract_id": contract_id,
            "freelancer_id": freelancer_id,
            "text": "This is a contract chunk text for deletion testing",
            "embedding": [0.1] * 384
        })
        
        # Verify initial database state
        assert db.contracts.count_documents({"_id": contract_oid}) == 1
        assert db.milestones.count_documents({"contract_id": contract_id}) == 1
        assert db.milestone_events.count_documents({"milestone_id": {"$in": [milestone_oid, milestone_id]}}) == 2
        assert db.invoices.count_documents({"contract_id": contract_id}) == 1
        assert db.followup_logs.count_documents({"invoice_id": invoice_id}) == 1
        assert db.contract_chunks.count_documents({"contract_id": contract_id}) == 1
        
        # Verify GridFS files exist
        assert GridFSBucket(db, bucket_name="contracts").open_download_stream(ObjectId(contract_file_id)) is not None
        assert GridFSBucket(db, bucket_name="invoices").open_download_stream(ObjectId(invoice_file_id)) is not None
        
        # 4. Trigger Contract Deletion Endpoint
        client = TestClient(app)
        response = client.delete(
            f"/api/contracts/{contract_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Contract deleted successfully"
        
        # 5. Assert all database records are cleared
        assert db.contracts.count_documents({"_id": contract_oid}) == 0
        assert db.milestones.count_documents({"contract_id": contract_id}) == 0
        assert db.milestone_events.count_documents({"milestone_id": {"$in": [milestone_oid, milestone_id]}}) == 0
        assert db.invoices.count_documents({"contract_id": contract_id}) == 0
        assert db.followup_logs.count_documents({"invoice_id": invoice_id}) == 0
        assert db.contract_chunks.count_documents({"contract_id": contract_id}) == 0
        
        # 6. Assert GridFS files are deleted (open_download_stream should throw error or raise NoFile equivalent)
        from gridfs.errors import NoFile
        import pytest
        
        with pytest.raises(Exception):
            GridFSBucket(db, bucket_name="contracts").open_download_stream(ObjectId(contract_file_id)).read()
            
        with pytest.raises(Exception):
            GridFSBucket(db, bucket_name="invoices").open_download_stream(ObjectId(invoice_file_id)).read()
            
    finally:
        # Clean up database
        db.profiles.delete_many({"_id": freelancer_oid})
        db.contracts.delete_many({"freelancer_id": freelancer_id})
        db.milestones.delete_many({"freelancer_id": freelancer_id})
        db.invoices.delete_many({"freelancer_id": freelancer_id})
        
        # Clean up leftover GridFS entries just in case
        try:
            GridFSBucket(db, bucket_name="contracts").delete(ObjectId(contract_file_id))
        except Exception:
            pass
        try:
            GridFSBucket(db, bucket_name="invoices").delete(ObjectId(invoice_file_id))
        except Exception:
            pass
