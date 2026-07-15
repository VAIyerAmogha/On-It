import logging
import datetime
import os
import tempfile
from datetime import timezone
from typing import Optional
from bson.objectid import ObjectId
from pymongo import ReturnDocument

from helpers import storage
from helpers import state_machine
from helpers import llm_client
from helpers import email_utils

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

import config
GST_DEFAULT_RATE = config.GST_DEFAULT_RATE

class InvoiceGenError(Exception):
    pass

def build_invoice_data(db, milestone_id: str, delivery_missed: bool = False, discount_percentage: float = 0.0) -> dict:
    try:
        query_id = ObjectId(milestone_id)
    except Exception:
        query_id = milestone_id

    milestone = db.milestones.find_one({"_id": query_id})
    if not milestone:
        raise InvoiceGenError(f"Milestone {milestone_id} not found")

    contract_id = milestone.get("contract_id")
    try:
        c_query_id = ObjectId(contract_id)
    except Exception:
        c_query_id = contract_id

    contract = db.contracts.find_one({"_id": c_query_id})
    if not contract:
        raise InvoiceGenError(f"Contract {contract_id} not found")

    freelancer_id = milestone.get("freelancer_id")
    try:
        f_query_id = ObjectId(freelancer_id)
    except Exception:
        f_query_id = freelancer_id

    profile = db.profiles.find_one({"_id": f_query_id})
    if not profile:
        raise InvoiceGenError(f"Freelancer profile {freelancer_id} not found")

    if milestone.get("status") != "TRIGGERED":
        raise InvoiceGenError(f"Milestone status is not TRIGGERED, got: {milestone.get('status')}")

    if milestone.get("amount_inr") is None:
        raise InvoiceGenError("Milestone amount_inr is null")

    amount_inr = milestone["amount_inr"]
    if delivery_missed and discount_percentage > 0:
        discount_amount = round(amount_inr * (discount_percentage / 100.0), 2)
        discounted_amount = amount_inr - discount_amount
        amount_before_gst = discounted_amount
    else:
        amount_before_gst = amount_inr

    gst_rate = profile.get("default_gst_rate")
    if gst_rate is None:
        gst_rate = GST_DEFAULT_RATE

    gst_amount = round(amount_before_gst * gst_rate, 2)
    total_amount = round(amount_before_gst * (1 + gst_rate), 2)

    today = datetime.date.today()
    payment_terms = contract.get("payment_terms_days")
    if payment_terms is None:
        payment_terms = 0
    due_date = today + datetime.timedelta(days=payment_terms)
    
    contract_date = contract.get("contract_date")
    if isinstance(contract_date, datetime.datetime):
        contract_date_str = contract_date.strftime("%Y-%m-%d")
    elif isinstance(contract_date, str):
        contract_date_str = contract_date.split("T")[0]
    else:
        contract_date_str = str(contract_date)

    total_milestones = db.milestones.count_documents({"contract_id": contract_id})

    milestone_number = milestone.get("milestone_number", 0)
    description = milestone.get("deliverable_description")
    if not description:
        description = f"Milestone {milestone_number}"

    prefix = profile.get("invoice_prefix", "INV")
    counter = profile.get("invoice_counter", 1)
    invoice_number = f"{prefix}-{counter:04d}"

    data = {
        "freelancer": {
            "name": profile.get("name"),
            "address": profile.get("address"),
            "gstin": profile.get("gstin")
        },
        "client": {
            "name": contract.get("client_name") or (contract.get("client_contact") or {}).get("name") or "",
            "address": contract.get("client_address") or ""
        },
        "invoice_number": invoice_number,
        "invoice_date": today.strftime("%Y-%m-%d"),
        "due_date": due_date.strftime("%Y-%m-%d"),
        "line_item": {
            "description": description,
            "amount_before_gst": amount_before_gst
        },
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "total_amount": total_amount,
        "footer_note": f"As per Contract dated {contract_date_str}, Milestone {milestone_number} of {total_milestones}"
    }

    if delivery_missed and discount_percentage > 0:
        data.update({
            "delivery_missed": True,
            "discount_percentage": discount_percentage,
            "discount_amount": discount_amount,
            "original_amount_inr": amount_inr,
            "amount_before_gst": amount_before_gst
        })

    return data

def send_followup_email(db, milestone: dict) -> None:
    milestone_id = str(milestone["_id"])
    
    invoice = db.invoices.find_one({"milestone_id": milestone_id})
    if not invoice:
        invoice = db.invoices.find_one({"milestone_id": milestone["_id"]})
        if not invoice:
            logging.error(f"Cannot send followup, no invoice found for milestone {milestone_id}")
            return
            
    if invoice.get("followup_paused"):
        logging.info(f"Followup paused for invoice {invoice['_id']}")
        return
        
    today_date = datetime.date.today()
    due_date_str = invoice.get("due_date") or milestone.get("due_date")
    if not due_date_str:
        return
        
    try:
        due_date_obj = datetime.datetime.strptime(due_date_str, "%Y-%m-%d").date()
    except Exception:
        due_date_obj = due_date_str.date() if hasattr(due_date_str, "date") else None
        if not due_date_obj:
            return
            
    days_from_due = (today_date - due_date_obj).days
    
    tone_map = {
        -3: "friendly reminder before due date",
        0: "neutral reminder, due today",
        7: "first overdue notice",
        14: "second overdue notice, firmer tone",
        30: "final notice, escalated tone"
    }
    tone = tone_map.get(days_from_due, "professional")
    
    contract_id = milestone.get("contract_id")
    try:
        c_query_id = ObjectId(contract_id)
    except Exception:
        c_query_id = contract_id
    contract = db.contracts.find_one({"_id": c_query_id})
    if not contract:
        return
        
    freelancer_id = invoice.get("freelancer_id")
    try:
        f_query_id = ObjectId(freelancer_id)
    except Exception:
        f_query_id = freelancer_id
    profile = db.profiles.find_one({"_id": f_query_id})
    freelancer_name = profile.get("name", "") if profile else ""
        
    amount = invoice.get("total_amount", 0.0)
    client_name = contract.get("client_name") or (contract.get("client_contact") or {}).get("name") or ""
    project_name = contract.get("project_name", "")
    
    body = generate_cover_note(client_name, project_name, amount, due_date_str, freelancer_name, tone=tone)
    pdf_bytes = storage.retrieve_pdf(db, invoice["pdf_file_id"])
    
    subject = f"Invoice {invoice['invoice_number']} Follow-up - {contract['project_name']}"
    if days_from_due > 0:
        subject = f"OVERDUE: Invoice {invoice['invoice_number']} - {contract['project_name']}"
        
    client_email = contract.get("client_email") or (contract.get("client_contact") or {}).get("email")
    if not client_email:
        logging.error(f"Cannot send followup for invoice {invoice['_id']}, missing client_email")
        return
        
    now = datetime.datetime.now(timezone.utc)
    delivery_status = "sent"

    try:
        email_utils.send_email(
            to=client_email,
            subject=subject,
            body=body,
            attachments=[{
                "filename": f"{invoice['invoice_number']}.pdf",
                "content": pdf_bytes
            }]
        )
    except Exception as e:
        logging.error(f"Failed to send followup email: {e}")
        delivery_status = "failed"
        
    db.followup_logs.insert_one({
        "invoice_id": str(invoice["_id"]),
        "freelancer_id": invoice["freelancer_id"],
        "schedule_day": days_from_due,
        "sent_at": now,
        "template_name": f"followup_day_{days_from_due}",
        "recipient_email": contract.get("client_email") or (contract.get("client_contact") or {}).get("email") or "",
        "subject": subject,
        "delivery_status": delivery_status
    })

def generate_invoice_pdf(invoice_data: dict, output_path: str) -> str:
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=18
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='RightAlign', parent=styles['Normal'], alignment=2))
    styles.add(ParagraphStyle(name='Center', parent=styles['Normal'], alignment=1))
    
    elements = []
    
    # Title
    elements.append(Paragraph("<b>INVOICE</b>", styles['Heading1']))
    elements.append(Spacer(1, 10))
    
    # Top section: Freelancer (Left) | Client (Right)
    freelancer = invoice_data.get('freelancer', {})
    client = invoice_data.get('client', {})
    
    freelancer_text = f"<b>From:</b><br/>" \
                      f"{freelancer.get('name', '')}<br/>" \
                      f"{freelancer.get('address', '')}<br/>" \
                      f"GSTIN: {freelancer.get('gstin', '')}"
                      
    client_text = f"<b>To:</b><br/>" \
                  f"{client.get('name', '')}<br/>" \
                  f"{client.get('address', '')}"
                  
    header_table_data = [
        [Paragraph(freelancer_text, styles['Normal']), Paragraph(client_text, styles['RightAlign'])]
    ]
    
    header_table = Table(header_table_data, colWidths=[doc.width/2.0]*2)
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    elements.append(header_table)
    elements.append(Spacer(1, 20))
    
    # Metadata box
    meta_text = f"<b>Invoice Number:</b> {invoice_data.get('invoice_number', '')}<br/>" \
                f"<b>Invoice Date:</b> {invoice_data.get('invoice_date', '')}<br/>" \
                f"<b>Due Date:</b> {invoice_data.get('due_date', '')}"
    
    elements.append(Paragraph(meta_text, styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Line items table
    line_item = invoice_data.get('line_item', {})
    desc = line_item.get('description', '')
    amt = f"{line_item.get('amount_before_gst', 0):.2f}"
    
    gst_rate_pct = invoice_data.get('gst_rate', 0) * 100
    gst_amt = f"{invoice_data.get('gst_amount', 0):.2f}"
    total_amt = f"{invoice_data.get('total_amount', 0):.2f}"
    
    delivery_missed = invoice_data.get('delivery_missed', False)
    discount_percentage = invoice_data.get('discount_percentage', 0.0)
    discount_amount = invoice_data.get('discount_amount', 0.0)

    table_data = [
        ['Description', 'Amount (INR)'],
        [Paragraph(desc, styles['Normal']), amt]
    ]

    if delivery_missed and discount_percentage > 0:
        pct_str = f"{int(discount_percentage)}" if discount_percentage % 1 == 0 else f"{discount_percentage}"
        table_data.append([
            f"Goodwill Discount ({pct_str}%)",
            f"-₹{discount_amount:.2f}"
        ])

    table_data.extend([
        [f'GST ({gst_rate_pct:.1f}%)', gst_amt],
        ['Total', total_amt]
    ])
    
    t = Table(table_data, colWidths=[doc.width * 0.7, doc.width * 0.3])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.silver),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    
    elements.append(t)
    elements.append(Spacer(1, 30))
    
    # Spacer instead of bank details to re-balance layout
    elements.append(Spacer(1, 40))
    
    # Footer note
    footer = invoice_data.get('footer_note', '')
    elements.append(Paragraph(footer, styles['Center']))
    
    doc.build(elements)
    
    return output_path

def create_invoice(
    db, 
    milestone_id: str, 
    edited_amount: Optional[float] = None,
    delivery_missed: bool = False,
    discount_percentage: float = 0.0
) -> dict:
    data = build_invoice_data(db, milestone_id, delivery_missed=delivery_missed, discount_percentage=discount_percentage)
    
    modified_fields = []
    modified_from_contract = False
    original_contract_amount = data["line_item"]["amount_before_gst"]
    
    if edited_amount is not None and edited_amount != original_contract_amount:
        data["line_item"]["amount_before_gst"] = edited_amount
        
        gst_rate = data["gst_rate"]
        data["gst_amount"] = round(edited_amount * gst_rate, 2)
        data["total_amount"] = round(edited_amount * (1 + gst_rate), 2)
        
        modified_fields.append("amount")
        modified_from_contract = True

    temp_path = os.path.join(tempfile.gettempdir(), f"invoice_{milestone_id}.pdf")
    generate_invoice_pdf(data, temp_path)
    
    try:
        query_id = ObjectId(milestone_id)
    except Exception:
        query_id = milestone_id
        
    milestone = db.milestones.find_one({"_id": query_id})
    contract_id = milestone["contract_id"]
    freelancer_id = milestone["freelancer_id"]
    invoice_number = data["invoice_number"]
    
    pdf_file_id = storage.save_pdf(
        db, 
        temp_path, 
        filename=f"{invoice_number}.pdf",
        metadata={"contract_id": contract_id, "freelancer_id": freelancer_id}
    )
    
    if os.path.exists(temp_path):
        os.remove(temp_path)
        
    try:
        f_query_id = ObjectId(freelancer_id)
    except Exception:
        f_query_id = freelancer_id
        
    db.profiles.find_one_and_update(
        {"_id": f_query_id},
        {"$inc": {"invoice_counter": 1}},
        return_document=ReturnDocument.BEFORE
    )
    
    invoice_doc = {
        "milestone_id": str(query_id),
        "contract_id": str(contract_id),
        "freelancer_id": str(freelancer_id),
        "invoice_number": invoice_number,
        "invoice_date": data["invoice_date"],
        "due_date": data["due_date"],
        "amount_before_gst": data["line_item"]["amount_before_gst"],
        "gst_rate": data["gst_rate"],
        "gst_amount": data["gst_amount"],
        "total_amount": data["total_amount"],
        "pdf_file_id": pdf_file_id,
        "modified_fields": modified_fields,
        "created_at": datetime.datetime.now(timezone.utc),
        "delivery_missed": bool(delivery_missed),
        "discount_percentage": float(discount_percentage)
    }
    
    if delivery_missed and discount_percentage > 0:
        invoice_doc["discount_amount"] = data.get("discount_amount")
        invoice_doc["original_amount_inr"] = data.get("original_amount_inr")
        
    if modified_from_contract:
        invoice_doc["original_contract_amount"] = original_contract_amount
        
    inserted = db.invoices.insert_one(invoice_doc)
    invoice_doc["_id"] = inserted.inserted_id
    
    state_machine.mark_invoiced(db, str(query_id), invoice_number, data["due_date"])
    
    return invoice_doc

def generate_cover_note(
    client_name: str, 
    project_name: str, 
    amount: float, 
    due_date: str, 
    freelancer_name: str, 
    tone: str = "professional",
    delivery_missed: bool = False,
    discount_percentage: float = 0.0
) -> str:
    if delivery_missed:
        pct_str = f"{int(discount_percentage)}" if discount_percentage % 1 == 0 else f"{discount_percentage}"
        system_prompt = (
            "You are a professional assistant writing an email on behalf of a freelancer to their client. "
            "The email accompanies an invoice sent by the freelancer to get paid for a completed project milestone. "
            "Write a warm but professional two-sentence email body from the freelancer to the client, "
            "acknowledging the project delivery delay professionally without being overly apologetic (do not grovel). "
            f"Mention that a goodwill discount of {pct_str}% has been applied. "
            "State the final amount due and due date clearly. "
            "Do not include any invented details, subject lines, or signature blocks. The tone should represent the freelancer directly."
        )
        user_prompt = f"Client Name: {client_name}\nProject Name: {project_name}\nFinal Amount Due: ₹{amount:.2f}\nDue Date: {due_date}"
    else:
        system_prompt = (
            "You are a professional assistant writing an email on behalf of a freelancer to their client. "
            "The email accompanies an invoice sent by the freelancer to get paid for a completed project milestone. "
            f"Write a {tone} two-sentence email body from the freelancer to the client given ONLY the structured inputs. "
            "Do not include any invented details, subject lines, or signature blocks. The tone should represent the freelancer directly."
        )
        user_prompt = f"Client Name: {client_name}\nProject Name: {project_name}\nAmount: {amount}\nDue Date: {due_date}"
        
    body = llm_client.call_groq(system_prompt, user_prompt)
    wrapper = f"{body}\n\nThis invoice is sent on behalf of {freelancer_name} via On-It."
    return wrapper

def build_cover_note(db, invoice_id: str) -> dict:
    try:
        query_id = ObjectId(invoice_id)
    except Exception:
        query_id = invoice_id
        
    invoice = db.invoices.find_one({"_id": query_id})
    if not invoice:
        raise InvoiceGenError(f"Invoice {invoice_id} not found")
        
    contract_id = invoice.get("contract_id")
    try:
        c_query_id = ObjectId(contract_id)
    except Exception:
        c_query_id = contract_id
    contract = db.contracts.find_one({"_id": c_query_id})
    
    freelancer_id = invoice.get("freelancer_id")
    try:
        f_query_id = ObjectId(freelancer_id)
    except Exception:
        f_query_id = freelancer_id
    profile = db.profiles.find_one({"_id": f_query_id})
    
    client_name = contract.get("client_name") or (contract.get("client_contact") or {}).get("name") or ""
    project_name = contract.get("project_name") or contract.get("title") or ""
    freelancer_name = profile.get("name", "") if profile else ""
    amount = invoice.get("total_amount", 0.0)
    due_date = invoice.get("due_date", "")
    
    import datetime
    
    tone = "professional"
    is_overdue = False
    if due_date:
        try:
            today_date = datetime.date.today()
            due_date_obj = datetime.datetime.strptime(due_date, "%Y-%m-%d").date()
            days_from_due = (today_date - due_date_obj).days
            if days_from_due > 0:
                is_overdue = True
                if days_from_due >= 30:
                    tone = "final notice, escalated tone"
                elif days_from_due >= 14:
                    tone = "second overdue notice, firmer tone"
                elif days_from_due >= 7:
                    tone = "first overdue notice"
                else:
                    tone = "neutral reminder, due today"
        except Exception:
            pass
            
    delivery_missed = invoice.get("delivery_missed", False)
    discount_percentage = invoice.get("discount_percentage", 0.0)
            
    body = generate_cover_note(
        client_name, 
        project_name, 
        amount, 
        due_date, 
        freelancer_name, 
        tone=tone,
        delivery_missed=delivery_missed,
        discount_percentage=discount_percentage
    )
    subject = f"Invoice {invoice.get('invoice_number', '')} - {project_name}"
    if is_overdue:
        subject = f"OVERDUE: Invoice {invoice.get('invoice_number', '')} - {project_name}"
        
    client_email = contract.get("client_email") or (contract.get("client_contact") or {}).get("email") or ""
    
    return {
        "to": client_email,
        "subject": subject,
        "body": body
    }

