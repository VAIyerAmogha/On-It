"""
On-It — End-to-End Backend Test

Exercises the full pipeline in one run:
  register -> settings -> upload -> ingestion/classification/extraction
  -> mark trigger -> generate invoice -> download PDF (GridFS) -> mark paid
  -> lazy checks -> RAG QA

Run with the backend up locally (uvicorn main:app --reload) and at least
one fixture available (defaults to sample_native.pdf from Phase 2 testing).

    python3 e2e_test.py

Exits non-zero on the first hard failure, printing a clear PASS/FAIL per
stage as it goes so you know exactly where it broke.

Known gap this script works around: the Phase 3 plan doesn't define a step
that extracts contracts.project_value from contract text (only individual
milestone anchors are extracted). If percentage-based milestones come back
with amount_inr still null after upload, this script will pause and print a
one-line Mongo command to set contracts.project_value and re-resolve
amounts manually before continuing, rather than silently faking success.
Flagging this explicitly since it's a real hole in the current plan, not a
bug in this test.
"""
from __future__ import annotations

import sys
import time
import uuid
from typing import Optional

import requests

BASE_URL = "http://localhost:8000"
FIXTURE_PATH = "tests/fixtures/sample_native.pdf"
POLL_INTERVAL_SECONDS = 2
POLL_TIMEOUT_SECONDS = 60

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"


class E2EFailure(Exception):
    pass


def step(name: str):
    print(f"\n--- {name} ---")


def check(condition: bool, message: str):
    if condition:
        print(f"  [{PASS}] {message}")
    else:
        print(f"  [{FAIL}] {message}")
        raise E2EFailure(message)


def poll_until(fetch_fn, predicate_fn, description: str, timeout=POLL_TIMEOUT_SECONDS):
    start = time.time()
    last = None
    while time.time() - start < timeout:
        last = fetch_fn()
        if predicate_fn(last):
            return last
        time.sleep(POLL_INTERVAL_SECONDS)
    raise E2EFailure(f"Timed out waiting for: {description}. Last seen: {last}")


def main():
    session = requests.Session()
    unique = uuid.uuid4().hex[:8]
    email = f"e2e_test_{unique}@example.com"
    password = "TestPass123!"

    # ---------------------------------------------------------------
    step("1. Register + login")
    r = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": password, "name": "E2E Test User",
    })
    check(r.status_code in (200, 201), f"register returned {r.status_code}")

    r = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": email, "password": password,
    })
    check(r.status_code == 200, f"login returned {r.status_code}")
    token = r.json().get("access_token") or r.json().get("token")
    check(bool(token), "login response contains a JWT")
    session.headers.update({"Authorization": f"Bearer {token}"})

    # ---------------------------------------------------------------
    step("2. Populate profile (needed for invoice auto-fill)")
    r = session.put(f"{BASE_URL}/api/settings", json={
        "name": "E2E Test User",
        "address": "1 Test Street, Bengaluru, Karnataka 560001",
        "gstin": "29ABCDE1234F1Z5",
        "default_gst_rate": 0.18,
        "invoice_prefix": "E2E",
        "invoice_counter": 1,
    })
    check(r.status_code == 200, f"settings update returned {r.status_code}")

    # ---------------------------------------------------------------
    step("3. Upload contract")
    with open(FIXTURE_PATH, "rb") as f:
        r = session.post(
            f"{BASE_URL}/api/contracts/upload",
            files={"file": (FIXTURE_PATH.split("/")[-1], f, "application/pdf")},
        )
    check(r.status_code in (200, 201), f"upload returned {r.status_code}")
    upload_data = r.json()
    contract_id = upload_data["contract_id"]
    check(upload_data.get("extraction_status") == "processing",
          "upload returns extraction_status: processing immediately (non-blocking)")

    # ---------------------------------------------------------------
    step("4. Poll for ingestion + classification + extraction")

    def fetch_contract():
        resp = session.get(f"{BASE_URL}/api/contracts/{contract_id}")
        check(resp.status_code == 200, f"GET contract returned {resp.status_code}")
        return resp.json()

    result = poll_until(
        fetch_contract,
        lambda d: d["contract"].get("extraction_status") not in (None, "processing"),
        "extraction_status to leave 'processing'",
    )
    status = result["contract"]["extraction_status"]
    check(status in ("extracted", "ingested", "review_required"),
          f"extraction_status settled as '{status}' (not 'failed')")
    check(result["contract"].get("contract_type") is not None,
          f"contract_type classified as '{result['contract'].get('contract_type')}'")
    milestones = result["milestones"]
    check(len(milestones) > 0, f"{len(milestones)} milestone(s) extracted")

    # ---------------------------------------------------------------
    step("5. Check milestone amounts resolved")
    unresolved = [m for m in milestones if m.get("amount_inr") is None and m.get("percentage") is not None]
    if unresolved:
        print(f"  [!] {len(unresolved)} milestone(s) have a percentage but no amount_inr.")
        print("      This is the known project_value gap flagged at the top of this script.")
        print("      Fix manually, then re-run this script:")
        print(f"""
      python3 -c "
from db import get_db
db = get_db()
db.contracts.update_one({{'_id': '{contract_id}'}}, {{'\\$set': {{'project_value': 200000}}}})
for m in db.milestones.find({{'contract_id': '{contract_id}', 'amount_inr': None}}):
    pct = m.get('percentage')
    if pct is not None:
        db.milestones.update_one({{'_id': m['_id']}}, {{'\\$set': {{'amount_inr': round(200000 * pct / 100, 2)}}}})
"
        """)
        raise E2EFailure("milestone amounts unresolved — see instructions above")
    print(f"  [{PASS}] all percentage-based milestones have amount_inr resolved")

    # ---------------------------------------------------------------
    step("6. Mark first PENDING event/signing-based milestone as TRIGGERED")
    target = next((m for m in milestones if m["status"] == "PENDING" and m["trigger_type"] != "recurring"), None)
    check(target is not None, "found a PENDING non-recurring milestone to test")
    milestone_id = target["_id"]

    r = session.patch(f"{BASE_URL}/api/milestones/{milestone_id}/trigger")
    check(r.status_code == 200, f"PATCH trigger returned {r.status_code}")
    check(r.json()["status"] == "TRIGGERED", "milestone status is now TRIGGERED")

    # ---------------------------------------------------------------
    step("7. Generate invoice")
    r = session.post(f"{BASE_URL}/api/milestones/{milestone_id}/invoice", json={})
    check(r.status_code in (200, 201), f"POST invoice returned {r.status_code}")
    invoice = r.json()
    invoice_id = invoice["_id"]
    check("pdf_file_id" in invoice, "invoice has pdf_file_id (GridFS reference)")
    check("file_url" not in invoice, "invoice has NO file_url (Cloudinary fully removed)")

    r = session.get(f"{BASE_URL}/api/milestones/{contract_id}"
                     if False else f"{BASE_URL}/api/contracts/{contract_id}")
    updated_milestones = r.json()["milestones"]
    updated_target = next(m for m in updated_milestones if m["_id"] == milestone_id)
    check(updated_target["status"] == "INVOICED", "milestone status is now INVOICED")

    # ---------------------------------------------------------------
    step("8. Download invoice PDF directly (no redirect, streamed from GridFS)")
    r = session.get(f"{BASE_URL}/api/invoices/{invoice_id}/pdf", allow_redirects=False)
    check(r.status_code == 200, f"PDF download returned {r.status_code} (expected 200, not a redirect)")
    check("Location" not in r.headers, "no Location header (confirms no redirect to external storage)")
    check(r.headers.get("content-type", "").startswith("application/pdf"), "content-type is application/pdf")
    check(len(r.content) > 100, f"PDF body has real content ({len(r.content)} bytes)")

    # ---------------------------------------------------------------
    step("9. Mark invoice paid")
    r = session.patch(f"{BASE_URL}/api/milestones/{milestone_id}/paid")
    check(r.status_code == 200, f"PATCH paid returned {r.status_code}")
    paid_body = r.json()
    paid_status = paid_body.get("milestone", paid_body).get("status")
    check(paid_status == "PAID", "milestone status is now PAID")

    # ---------------------------------------------------------------
    step("10. Run manual lazy checks (check-now)")
    r = session.post(f"{BASE_URL}/api/milestones/check-now")
    check(r.status_code == 200, f"check-now returned {r.status_code}")
    counts = r.json()
    print(f"  check-now result: {counts}")

    # ---------------------------------------------------------------
    step("11. RAG QA (only if this contract finished indexing)")
    r = session.get(f"{BASE_URL}/api/contracts/{contract_id}")
    indexed = r.json()["contract"].get("indexed_for_rag")
    if not indexed:
        print("  [!] Skipping — contract not indexed_for_rag yet (Phase 6 indexing may still be running,"
              " or Phase 6 isn't wired into the upload pipeline in your build yet).")
    else:
        r = session.post(f"{BASE_URL}/api/contracts/{contract_id}/ask",
                          json={"question": "When is the first payment due?"})
        check(r.status_code == 200, f"ask endpoint returned {r.status_code}")
        answer = r.json()
        check(bool(answer.get("answer")), "got a non-empty answer")
        print(f"  answer: {answer['answer']}")
        print(f"  faithfulness_score: {answer.get('faithfulness_score')}")

    # ---------------------------------------------------------------
    print("\n=== END-TO-END TEST COMPLETE — all checked stages passed ===")


if __name__ == "__main__":
    try:
        main()
    except E2EFailure as exc:
        print(f"\n=== END-TO-END TEST FAILED: {exc} ===")
        sys.exit(1)
    except requests.RequestException as exc:
        print(f"\n=== NETWORK ERROR: {exc} — is the backend running at {BASE_URL}? ===")
        sys.exit(1)