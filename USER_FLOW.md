# On-It — Complete User Flow & Polish Guide

> **Audience:** Developer / Product reference. Covers every screen, state, and action a user can encounter, followed by real-world recommendations for making the experience more polished.

---

## Table of Contents

1. [Landing Page](#1-landing-page)
2. [Registration](#2-registration)
3. [Email Verification](#3-email-verification)
4. [Login](#4-login)
5. [Dashboard](#5-dashboard)
6. [Contract Upload](#6-contract-upload)
7. [Contract Processing & Extraction](#7-contract-processing--extraction)
8. [Contract Detail Page](#8-contract-detail-page)
9. [Milestone Lifecycle](#9-milestone-lifecycle)
   - [9a. PENDING → TRIGGERED](#9a-pending--triggered)
   - [9b. TRIGGERED → INVOICED (Normal)](#9b-triggered--invoiced-normal)
   - [9c. TRIGGERED → INVOICED (Missed Deadline)](#9c-triggered--invoiced-missed-deadline)
   - [9d. INVOICED → OVERDUE (Automatic)](#9d-invoiced--overdue-automatic)
   - [9e. INVOICED / OVERDUE → PAID](#9e-invoiced--overdue--paid)
   - [9f. Recurring Milestones](#9f-recurring-milestones)
10. [Invoice Detail Page](#10-invoice-detail-page)
11. [Contract AI Chat (RAG)](#11-contract-ai-chat-rag)
12. [Settings](#12-settings)
13. [Notifications Panel](#13-notifications-panel)
14. [Edge Cases & Error States](#14-edge-cases--error-states)
15. [Real-World Polish Recommendations](#15-real-world-polish-recommendations)

---

## 1. Landing Page

**Route:** `/`  
**Access:** Public (no auth required)

The user lands on a marketing page with:
- **Hero section** — headline "Contract to Invoice. On Autopilot.", CTA buttons: **Start for Free** (`/auth/register`) and **Log In** (`/auth/login`).
- **Problem/Solution section** — pain points (missed dates, manual invoicing) with a mock milestone card visual.
- **How It Works** — 3-step visual: Upload → Extract → Invoice.
- **Features Grid** — Automatic Extraction, GST-Compliant Invoicing, Contract Q&A Chat, Smart Follow-ups.
- **CTA Section** — second "Create Your Free Account" button.
- **Footer** — Log In and Get Started links.

**Possible user actions:**
| Action | Destination |
|---|---|
| Click "Start for Free" | `/auth/register` |
| Click "Log In" | `/auth/login` |
| Click footer links | Same as above |

---

## 2. Registration

**Route:** `/auth/register`  
**Access:** Public

User fills in:
- **Full Name**
- **Email address**
- **Password**
- **"Sign up with Google"** button (Google OAuth)

**Standard registration flow:**
1. User submits the form.
2. Backend creates a profile with `email_verified: false` and sends a verification email with a 24-hour token link.
3. Frontend shows a success message: *"Registration successful. Please check your email to verify your account."*
4. User is **not** logged in yet — they must verify their email first.

**Google OAuth flow:**
1. User clicks "Sign in with Google" → Google consent screen.
2. Backend verifies the Google ID token, creates profile with `email_verified: true` (no verification step needed), issues a JWT.
3. User is immediately redirected to `/dashboard`.

**Error states:**
| Condition | Message shown |
|---|---|
| Email already registered | "Email already registered" |
| Server error | Generic error toast |

---

## 3. Email Verification

**Route:** `/verify-email?token=<token>`  
**Access:** Public (linked from email)

1. User clicks the link in their inbox.
2. Page automatically calls `GET /api/auth/verify-email?token=...` on load.
3. **Success:** Displays "Email verified successfully!" with a link to log in.
4. **Invalid token:** Displays "Invalid verification token" error.
5. **Expired token (>24 hours):** Displays "Expired verification token" error with an option to resend.

**Resend verification:**
- If the login attempt fails with `EMAIL_NOT_VERIFIED`, the login page shows a "Resend verification email" button.
- Calls `POST /api/auth/resend-verification` with the user's email.
- Always returns the same generic success message (to prevent email enumeration).

---

## 4. Login

**Route:** `/auth/login`  
**Access:** Public

User fills in email + password, or clicks "Sign in with Google".

**Standard login:**
1. Credentials are validated.
2. JWT token (7-day expiry) is issued and stored in `localStorage`.
3. User is redirected to `/dashboard`.

**Error states:**
| Condition | Message |
|---|---|
| Wrong email/password | "Invalid email or password" |
| Email not verified | "Email not verified" + resend button |
| Google-only account tries password login | "This account uses Google Sign-In — use the Google button instead" |

---

## 5. Dashboard

**Route:** `/dashboard`  
**Access:** Protected (requires JWT)

**Empty state:** If no contracts exist, a centered card prompts the user to upload their first contract, with a direct link to `/contracts/upload`.

**Populated state — two sections:**

### Notifications Panel (top)
Appears when there are active notifications. Dismissible per-session. Shows up to N items sorted by urgency. Each notification has an icon, description, amount/timing info, and inline action buttons. (See [Section 13](#13-notifications-panel) for full detail.)

### Contract Cards Grid
Each card displays:
- Project title (falls back to `project_name` → `"Untitled Project"`)
- Client name
- Contract type badge (e.g. "fixed price", "retainer")
- Extraction status indicator (processing / extracted / review required / failed)
- A mocked progress bar ("2 of 5 paid") — *note: currently hardcoded*
- A **trash icon** to delete the contract

**Clicking a card** navigates to `/contracts/<id>`.

**Deleting a contract:**
1. Browser `confirm()` dialog appears.
2. On confirm: contract, all milestones, and the GridFS PDF are deleted.
3. Card fades out of the grid immediately.

**Background job on load:** Every time the dashboard loads, `run_pending_checks` runs as a background task, automatically transitioning any `INVOICED` milestones past their due date to `OVERDUE`.

---

## 6. Contract Upload

**Route:** `/contracts/upload`  
**Access:** Protected

User drags & drops or selects a file.

**Accepted formats:** `.pdf`, `.docx`

**What happens on submit:**
1. File is uploaded to the backend via multipart form.
2. PDF is immediately stored in MongoDB GridFS.
3. A contract document is created with `extraction_status: "processing"`.
4. An async background task begins AI extraction.
5. User is redirected to the new contract's detail page at `/contracts/<id>`.

**Error states:**
| Condition | Behavior |
|---|---|
| No file selected | Upload button disabled / validation error |
| Wrong file type | HTTP 400 "Only .pdf and .docx files are supported" |
| GridFS save failure | HTTP 500 error toast |

---

## 7. Contract Processing & Extraction

**Route:** `/contracts/<id>` (while `extraction_status === "processing"`)

The contract detail page polls itself every **3 seconds**, showing a skeleton loader UI.

**Extraction pipeline (backend, async):**
1. **Ingestion** — Text extracted from PDF (native or OCR.space for scanned docs) or DOCX.
2. **Extraction** — Single Groq/Llama 3 call extracts: title, client contact, summary, project value, contract type, and all milestones.
3. **Amount resolution** — Milestone amounts computed from percentages if project value confidence is high enough.
4. **Milestone saving** — Each milestone saved with `status: "PENDING"`.
5. **RAG indexing** — Contract text chunked, embedded (HuggingFace), indexed in Atlas Vector Search.
6. **Status update** — Contract set to `extracted` or `review_required`.

**Possible final states:**
| Status | What user sees |
|---|---|
| `extracted` | Contract detail page with all milestones populated |
| `review_required` | Same, but milestones may have "TBD" amounts — user should review |
| `failed` | Error screen with extraction error message, links to Dashboard and re-upload |

---

## 8. Contract Detail Page

**Route:** `/contracts/<id>`  
**Access:** Protected (owner only)

Displays:
- **Back to Dashboard** breadcrumb
- **Contract header card:** Project title, client name, email, phone, contract type, contract date, AI-generated summary, total project value (INR)
- **"View Contract" button** → opens the original PDF at `/contracts/<id>/pdf`
- **"Ask Contract AI" button** → opens the RAG chat drawer
- **Milestone grid** — sorted by `milestone_number`, one card per milestone

**No milestones state:** An empty state with a file icon and explanatory text if extraction produced zero milestones.

---

## 9. Milestone Lifecycle

Each `MilestoneCard` adapts its UI and action buttons based on the current status.

```
PENDING → TRIGGERED → INVOICED → PAID
                              ↘ OVERDUE → PAID
```

---

### 9a. PENDING → TRIGGERED

**Card shows:** Gray "PENDING" badge, deliverable description, trigger condition/date, amount (or "TBD"), **"Mark Triggered"** button.

**User clicks "Mark Triggered":**
1. `PATCH /api/milestones/<id>/trigger`
2. State machine validates `PENDING → TRIGGERED` is legal.
3. Milestone updated to `TRIGGERED`, audit event logged.
4. Page refreshes — card now shows TRIGGERED state.

**Error:** HTTP 409 if milestone is not PENDING (e.g. race condition). Button re-enables.

---

### 9b. TRIGGERED → INVOICED (Normal)

**Card shows:** Accent "TRIGGERED" badge, two side-by-side buttons: **"Generate Invoice"** and **"Missed Deadline"**.

**User clicks "Generate Invoice":**
1. `POST /api/milestones/<id>/invoice`
2. Backend builds invoice: amount + GST using freelancer's `default_gst_rate`.
3. ReportLab generates an A4 PDF.
4. PDF saved to GridFS; invoice doc saved to MongoDB.
5. Freelancer's `invoice_counter` incremented.
6. Milestone transitioned to `INVOICED`.
7. Page refreshes — card shows "View Invoice" and "Mark Paid".

> **Note:** If email sending fails during this step, the invoice is still created. The user can manually send from the Invoice Detail page.

---

### 9c. TRIGGERED → INVOICED (Missed Deadline)

**User clicks "Missed Deadline":** A modal appears with:
- **Discount Percentage** input (integer, 1–100)
- **Live preview:** `₹{original} - {discount}% = ₹{final}`

**User enters discount and clicks "Generate Missed Deadline Invoice":**
1. `POST /api/milestones/<id>/invoice-missed-deadline` with `{ discount_percentage: 15 }`
2. Discount applied to `amount_inr`; GST calculated on the discounted amount.
3. PDF includes a "Goodwill Discount (15%)" line item.
4. Invoice stored with `delivery_missed: true`, `discount_percentage`, `discount_amount`, `original_amount_inr`.
5. Milestone → `INVOICED`.

**Validation errors:**
| Condition | Behavior |
|---|---|
| Empty / non-numeric | Inline: "Discount percentage must be an integer between 1 and 100" |
| ≤ 0 or > 100 | Same inline error |
| API error | Error shown inside modal; modal stays open |

---

### 9d. INVOICED → OVERDUE (Automatic)

This transition is **never user-triggered**. Every time the dashboard or milestones list loads, `run_pending_checks` scans for milestones with `status: "INVOICED"` and `due_date < today`, transitioning them to `OVERDUE`.

**What the user sees:** On their next visit, the milestone card shows the amber "OVERDUE" badge. The Notifications panel shows an `OVERDUE_PAYMENT` alert.

---

### 9e. INVOICED / OVERDUE → PAID

**Card shows (INVOICED or OVERDUE):**
- **"View Invoice"** → `/invoices/<id>`
- **"Mark Paid"** button

**User clicks "Mark Paid":**
1. `PATCH /api/milestones/<id>/paid`
2. State machine transitions milestone to `PAID`, records `paid_date` and calculates `payment_lag_days`.
3. Page refreshes — card shows green "PAID" badge + "Payment Completed" + "View Invoice".

**From the Dashboard:** The `OVERDUE_PAYMENT` notification also has an inline "Mark Paid" button with a fade-out animation on success.

---

### 9f. Recurring Milestones

For milestones with `trigger_type: "recurring"`, marking PAID automatically creates the **next milestone**:
- `status: "PENDING"`, `milestone_number + 1`
- `trigger_date` advanced by ~1 month (calendar-aware)
- All invoice/payment fields cleared
- New card appears immediately on next page load

---

## 10. Invoice Detail Page

**Route:** `/invoices/<id>`  
**Access:** Protected (owner only)

Displays:
- **Back to Contract** breadcrumb
- **Invoice header:** Invoice Number, Invoice Date, Due Date, Total Amount
- For missed-deadline invoices: strikethrough original amount + "Goodwill Discount Applied (X%)" badge
- **Embedded PDF preview** (react-pdf, inline) with pagination for multi-page invoices
- **Download PDF** button — triggers browser file download
- **Send Invoice to Client** / **Resend Invoice to Client** button (shows last-sent timestamp if previously sent)

### Send Invoice Modal

1. Modal opens; `GET /api/invoices/<id>/email-preview` called immediately.
2. Groq generates a context-aware 2-sentence cover note. Tone adapts: professional → neutral → escalating (overdue). Missed-deadline invoices acknowledge the delay and mention the goodwill discount.
3. Modal shows:
   - **To** (client email, read-only)
   - **From** (freelancer Gmail, read-only)
   - **Subject** (editable, AI-prefilled)
   - **Body** (editable textarea, AI-prefilled)
4. User reviews/edits and clicks **"Send Email"**.
5. `POST /api/invoices/<id>/send` → SMTP dispatch (freelancer Gmail App Password → falls back to global SMTP).
6. `followup_logs` entry created; `sent_at` saved to invoice.
7. Success: modal closes; green toast for 5 seconds.

**Error states:**
| Condition | Behavior |
|---|---|
| Client email missing | HTTP 400 "Client email not found" in modal |
| SMTP failure | Error message in modal, can retry |
| PDF missing from GridFS | HTTP 404 in modal |

---

## 11. Contract AI Chat (RAG)

**Trigger:** "Ask Contract AI" button on the Contract Detail page.

**Opens:** A slide-over drawer (400–450px wide on desktop, full-width on mobile) with a backdrop blur overlay. Clicking the backdrop or the ✕ button closes it.

**Initial state:** Welcome message: *"Ask me anything about this contract (e.g., 'What are the payment terms?' or 'Are there any late fees?')."*

**User sends a question:**
1. User bubble appears on the right; three-dot bounce animation while AI is thinking.
2. `POST /api/contracts/<id>/ask` with `{ question: "..." }`.
3. Backend: embed query → vector search → append live progress summary → Groq answer → NLI faithfulness check (threshold: 0.7).
4. AI response appears on the left.

**Response states:**
| Score | UI |
|---|---|
| ≥ 0.7 (verified) | Normal accent-colored bubble |
| < 0.5 (low) | Amber bubble + ⚠ "Couldn't explicitly verify this from the document." |
| API error | "Sorry, I encountered an error while trying to answer that question." |

Chat history is preserved within the session; lost on page reload.

---

## 12. Settings

**Route:** `/settings`  
**Access:** Protected

### Profile & Business Details
- Full Name / Business Name
- GSTIN (optional, appears on invoice PDF)
- Billing Address (appears on invoice PDF)

### Invoicing Defaults
- **Invoice Prefix** (e.g. `INV-` → generates `INV-0001`)
- **Default GST Rate** (decimal, e.g. `0.18` for 18%)

### Email Integration
- **Gmail Address** — "From" address for all sent invoices
- **Gmail App Password** — 16-character Google App Password (write-only; blank = keep existing)

**Save behavior:**
- If `gmail_app_password` is blank, it's excluded from the payload.
- On success: green "Saved successfully" indicator for 3 seconds.
- On error: red error message at top of form.

---

## 13. Notifications Panel

Appears at the top of the Dashboard when notifications exist and haven't been dismissed this session.

| Type | Icon | Content | Actions |
|---|---|---|---|
| `OVERDUE_PAYMENT` | 🔶 amber | `₹X overdue by N days` | "Mark Paid" inline + "View" → contract |
| `PAYMENT_DUE_SOON` | 🔵 accent | `₹X due in N days` | "View" → contract |
| `UPCOMING_DEADLINE` | ⬜ gray | `Deadline in N days` + date | "View" → contract |
| `UNINVOICED_MILESTONE` | 🔵 accent | `Triggered N days ago — invoice not raised yet` | "Generate Invoice" inline + "View" → contract |

**Inline actions:** Show a loading state on the button. On success, the row fades out and slides left, then is removed. On error, a small red error text appears below the row.

**"Dismiss" button:** Hides the panel for the current browser session (not persisted).

---

## 14. Edge Cases & Error States

| Scenario | What happens |
|---|---|
| Visit `/contracts/<id>` for a contract you don't own | 404 → "Contract not found or permission denied" + "Return to Dashboard" |
| Visit `/invoices/<id>` for an invoice you don't own | 404 → "Invoice not found" + "Back to Dashboard" |
| Milestone is INVOICED/OVERDUE/PAID but `invoice_id` is missing | `MilestoneCard` silently self-fetches `/api/invoices/by-milestone/<id>`; "View Invoice" only appears if found |
| Contract is still in `processing` state | Page polls every 3s, shows skeleton loader |
| Contract extraction `failed` | Full-page error card with extraction error text + links to Dashboard and Upload Again |
| Milestone `amount_inr` is null | Displayed as "TBD"; invoice generation fails (backend rejects null amount) |
| Google user tries email/password login | HTTP 400: "This account uses Google Sign-In — use the Google button instead" |
| JWT is expired | `apiFetch` returns 401 → `AuthContext` logs user out → redirect to `/auth/login` |
| Invoice PDF missing from GridFS | Preview shows "Preview unavailable"; download button shows `alert()` |
| SMTP send fails during invoice generation | Invoice still created; error silently swallowed; user can manually send from Invoice Detail page |
| Recurring milestone `trigger_date` is unparseable | New milestone created without advancing the date (silently caught) |

---

## 15. Real-World Polish Recommendations

---

### 🔴 Critical (blocks real-world usage)

**1. Dashboard milestone progress bar is hardcoded**
The "2 of 5 paid" text and bar on every contract card are static placeholders. Needs a real aggregate query (PAID count / total milestones per contract) to be useful.

**2. Client email is unreliably extracted**
The invoice send flow requires `client_email` from the contract. LLM extraction often misses or misattributes it. Add a **manual override field** on the Contract Detail page so users can correct the client email without re-uploading the contract.

**3. No way to edit milestones after extraction**
If the AI extracts a wrong amount, date, or description, the user is stuck. An inline edit on `MilestoneCard` (amount, description, trigger date) with a `PATCH /api/milestones/<id>` endpoint would dramatically improve trust in the tool.

**4. No onboarding checklist after sign-up**
New users arrive at an empty dashboard with no guidance. A simple checklist (☐ Add your business name → ☐ Add Gmail credentials → ☐ Upload your first contract) would dramatically improve activation rates.

---

### 🟡 Important (significantly impacts UX)

**5. Invoice PDF preview fetched on every load — no caching**
The PDF blob is refetched via authenticated request every time the Invoice page opens. Cache the blob URL in component state and add a layout-stable skeleton that matches the PDF dimensions to prevent layout shift.

**6. Errors still use `window.alert()`**
Delete contract failure and PDF download failure use `alert()`. Replace with a unified toast system (e.g. `react-hot-toast`) consistent with the glassmorphic design.

**7. No search or sort on the contract list**
As users add more contracts, finding a specific one requires scanning every card. Add a search bar (by client name or project title) and sort options (by date, by status).

**8. No proactive resend verification link**
The resend option only appears after a failed login. Add a link on the register success screen or a standalone `/auth/resend-verification` page so users who lose the email aren't stuck.

**9. Settings is one giant form with one save button**
If Email Integration fails but Profile succeeds, the user gets a combined error. Consider section-level save buttons, or at minimum indicate which section caused the failure.

**10. RAG chat history is lost on page reload**
For a tool reviewing long contracts, even `sessionStorage`-based history would be a meaningful improvement. Users often want to refer back to a previous answer.

---

### 🟢 Polish & Delight

**11. "Mark Triggered" has no confirmation step**
This is an irreversible action. A 2-step confirmation ("Is this deliverable actually complete?") prevents accidental triggers.

**12. Milestone cards don't show when they were triggered**
A small "Triggered Jul 10" timestamp on TRIGGERED/INVOICED/PAID cards helps the freelancer trace their billing history without opening each invoice.

**13. No email notification to the freelancer when a milestone goes OVERDUE**
The freelancer only discovers this on their next dashboard visit. A server-sent email ("⚠️ Invoice INV-0003 is now overdue — your client hasn't paid") would create urgency and drive re-engagement.

**14. GST rate field uses a raw decimal (0.18 not 18%)**
The Settings page requires typing `0.18` for 18% GST. Display and accept it as a percentage (18) and convert internally. The current UX confuses non-technical users.

**15. No PDF invoice branding / logo upload**
The generated PDF is functional but generic. Allowing freelancers to upload a logo and pick an accent color would make invoices look like a genuine business document.

**16. "Unsupported" contract type shows without explanation**
If the LLM classifies a contract as `unsupported`, users see "Unclassified" with no context. They should see: *"This contract type isn't supported for automated milestone extraction. You can still use the AI chat to ask questions about it."*

**17. Fallback SMTP sends silently from a system address**
If the user hasn't set up Gmail credentials, the invoice is sent from a generic system address with no warning. Show a banner: *"You're sending from the On-It system address. Add your Gmail in Settings to send as yourself."*

**18. No cross-contract invoice history view**
There's no `/invoices` list page. An invoice table (invoice number, client, amount, date, sent status) would be very useful for end-of-year reporting and payment tracking — a common freelancer need.
