import requests
from pymongo import MongoClient
from bson import ObjectId
import datetime
import random

db = MongoClient("mongodb://localhost:27017")["onit"]

# Create dummy user
freelancer_id = ObjectId()
db.profiles.insert_one({
    "_id": freelancer_id,
    "email": f"dummy{random.randint(0,999)}@example.com",
    "password_hash": "...",
    "name": "Dummy",
    "default_gst_rate": 0.18,
    "invoice_prefix": "INV-",
    "invoice_counter": 1
})

# Create dummy contract
contract_id = ObjectId()
db.contracts.insert_one({
    "_id": contract_id,
    "freelancer_id": str(freelancer_id),
    "client_name": "Client X",
    "project_name": "Project Y",
    "payment_terms_days": 30,
    "client_email": "client@example.com",
    "contract_date": datetime.datetime.now()
})

# Create dummy milestone
m_id = ObjectId()
db.milestones.insert_one({
    "_id": m_id,
    "freelancer_id": str(freelancer_id),
    "contract_id": str(contract_id),
    "status": "TRIGGERED",
    "amount_inr": 1000,
    "milestone_number": 1,
    "deliverable_description": "Test milestone",
    "trigger_type": "event_based"
})

print(f"Created milestone {m_id} for freelancer {freelancer_id}")

import jwt
expire = datetime.datetime.now() + datetime.timedelta(days=7)
token = jwt.encode({"sub": str(freelancer_id), "exp": expire}, "secret_not_used_here", algorithm="HS256")
# But wait, login to get real token
