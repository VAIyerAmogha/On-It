from datetime import datetime

from db import get_db

def build_progress_summary(contract_id: str, freelancer_id: str) -> dict:
    db = get_db()
    
    milestones_cursor = db.milestones.find({
        "contract_id": contract_id,
        "freelancer_id": freelancer_id
    })
    
    invoices_cursor = db.invoices.find({
        "contract_id": contract_id,
        "freelancer_id": freelancer_id
    })
    
    invoices_by_milestone = {}
    for inv in invoices_cursor:
        m_id = str(inv.get("milestone_id"))
        invoices_by_milestone[m_id] = inv
        
    milestone_results = []
    
    total_project_value = 0.0
    total_invoiced = 0.0
    total_paid = 0.0
    paid_count = 0
    pending_count = 0
    overdue_count = 0
    
    has_amount = False
    
    for m in milestones_cursor:
        m_id = str(m.get("_id"))
        status = m.get("status", "PENDING")
        amount = float(m.get("amount_inr") or 0.0)
        
        if amount > 0:
            has_amount = True
            total_project_value += amount
            
        if status == "PAID":
            paid_count += 1
        elif status == "PENDING":
            pending_count += 1
        elif status == "OVERDUE":
            overdue_count += 1
            
        invoice_doc = invoices_by_milestone.get(m_id)
        invoice_id = None
        invoice_status = None
        due_date_str = None
        paid_date_str = None
        
        if invoice_doc:
            invoice_id = str(invoice_doc.get("_id"))
            inv_total = float(invoice_doc.get("total_amount") or 0.0)
            
            if status == "PAID" or invoice_doc.get("paid_at"):
                invoice_status = "paid"
            elif status == "OVERDUE":
                invoice_status = "overdue"
            elif status == "INVOICED" or invoice_doc.get("sent_at"):
                invoice_status = "sent"
                
            total_invoiced += inv_total
            if invoice_status == "paid":
                total_paid += inv_total
                
            due_date = invoice_doc.get("due_date")
            if isinstance(due_date, datetime):
                due_date_str = due_date.strftime("%Y-%m-%d")
                
            paid_date = invoice_doc.get("paid_at")
            if isinstance(paid_date, datetime):
                paid_date_str = paid_date.strftime("%Y-%m-%d")

        t_date = m.get("trigger_date")
        t_date_str = t_date.strftime("%Y-%m-%d") if isinstance(t_date, datetime) else None

        milestone_results.append({
            "milestone_number": m.get("milestone_number"),
            "status": status,
            "trigger_type": m.get("trigger_type"),
            "trigger_condition": m.get("trigger_condition"),
            "trigger_date": t_date_str,
            "deliverable_description": m.get("deliverable_description"),
            "amount_inr": amount if amount > 0 else None,
            "invoice_id": invoice_id,
            "invoice_status": invoice_status,
            "due_date": due_date_str,
            "paid_date": paid_date_str
        })
        
    milestone_results.sort(key=lambda x: x.get("milestone_number") or 0)
    
    next_milestone = None
    for m in milestone_results:
        if m["status"] in ["PENDING", "TRIGGERED"]:
            next_milestone = {
                "milestone_number": m["milestone_number"],
                "trigger_condition": m["trigger_condition"],
                "trigger_date": m["trigger_date"]
            }
            break
            
    total_outstanding = max(0.0, total_invoiced - total_paid)
    
    summary = {
        "total_milestones": len(milestone_results),
        "paid_count": paid_count,
        "pending_count": pending_count,
        "overdue_count": overdue_count,
        "total_project_value": total_project_value if has_amount else None,
        "total_invoiced": total_invoiced,
        "total_paid": total_paid,
        "total_outstanding": total_outstanding,
        "next_milestone": next_milestone,
        "has_overdue": overdue_count > 0
    }
    
    return {
        "contract_id": contract_id,
        "milestones": milestone_results,
        "summary": summary
    }
