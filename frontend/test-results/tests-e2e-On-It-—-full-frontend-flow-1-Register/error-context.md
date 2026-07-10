# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/e2e.spec.ts >> On-It — full frontend flow >> 1. Register
- Location: tests/e2e.spec.ts:74:9

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/auth/register", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * On-It — Frontend End-to-End Test (Playwright)
  3   |  *
  4   |  * Drives the actual UI through the full user journey: register -> settings
  5   |  * -> upload -> contract detail -> mark triggered -> generate invoice ->
  6   |  * view invoice PDF -> mark paid -> ContractQA chat -> theme toggle -> logout.
  7   |  *
  8   |  * ------------------------------------------------------------------------
  9   |  * SETUP (one-time)
  10  |  * ------------------------------------------------------------------------
  11  |  *   cd frontend
  12  |  *   npm install -D @playwright/test
  13  |  *   npx playwright install --with-deps chromium
  14  |  *
  15  |  * Place this file at frontend/tests/e2e.spec.ts
  16  |  * Place a copy of your Phase 2 fixture at frontend/tests/fixtures/sample_native.pdf
  17  |  *
  18  |  * Run with the frontend AND backend both already running:
  19  |  *   uvicorn main:app --reload          (terminal 1, from backend/)
  20  |  *   npm run dev                        (terminal 2, from frontend/)
  21  |  *   npx playwright test                (terminal 3, from frontend/)
  22  |  *
  23  |  * ------------------------------------------------------------------------
  24  |  * REQUIRED data-testid ATTRIBUTES
  25  |  * ------------------------------------------------------------------------
  26  |  * The Phase 7 prompts didn't specify test ids, so add these to the
  27  |  * relevant components before running this — each is a one-line addition:
  28  |  *
  29  |  *   auth/register.tsx    : input[data-testid=email], input[data-testid=password],
  30  |  *                           input[data-testid=name], button[data-testid=submit]
  31  |  *   auth/login.tsx       : same email/password/submit test ids
  32  |  *   Header.tsx           : button[data-testid=theme-toggle], button[data-testid=logout]
  33  |  *   settings.tsx         : input[data-testid=field-<key>] for each field
  34  |  *                           (e.g. field-gstin, field-invoice_prefix), and
  35  |  *                           button[data-testid=settings-save]
  36  |  *   contracts/upload.tsx : input[data-testid=file-input] (the hidden <input
  37  |  *                           type=file>, even if the visible UI is a styled
  38  |  *                           dropzone wrapping it), and a status text element
  39  |  *                           data-testid=upload-status
  40  |  *   MilestoneCard.tsx    : root element data-testid=milestone-card-<id>,
  41  |  *                           status pill data-testid=milestone-status-<id>,
  42  |  *                           action buttons data-testid=trigger-btn-<id>,
  43  |  *                           data-testid=invoice-btn-<id>, data-testid=paid-btn-<id>
  44  |  *   milestones/[id].tsx  : input[data-testid=invoice-amount],
  45  |  *                           button[data-testid=invoice-submit]
  46  |  *   invoices/[id].tsx    : the react-pdf container data-testid=invoice-pdf-viewer,
  47  |  *                           button[data-testid=followup-toggle]
  48  |  *   ContractQA.tsx       : button[data-testid=open-qa] (on contract detail page),
  49  |  *                           input[data-testid=qa-input], button[data-testid=qa-send],
  50  |  *                           message elements data-testid=qa-message (repeated,
  51  |  *                           last one is the most recent)
  52  |  *
  53  |  * If you'd rather not add test ids, swap the locators below for Playwright's
  54  |  * role/text locators (getByRole, getByText) — test ids are just the most
  55  |  * stable option against the glass/animated UI from Phase 7.
  56  |  */
  57  | 
  58  | import { test, expect, Page } from "@playwright/test";
  59  | import path from "path";
  60  | 
  61  | const FIXTURE_PATH = path.join(__dirname, "fixtures", "sample_native.pdf");
  62  | const UPLOAD_POLL_TIMEOUT = 60_000;
  63  | 
  64  | function uniqueEmail(): string {
  65  |     return `e2e_frontend_${Date.now()}@example.com`;
  66  | }
  67  | 
  68  | test.describe.serial("On-It — full frontend flow", () => {
  69  |     let email: string;
  70  |     const password = "TestPass123!";
  71  |     let contractUrl: string;
  72  |     let invoiceUrl: string;
  73  | 
  74  |     test("1. Register", async ({ page }) => {
  75  |         email = uniqueEmail();
> 76  |         await page.goto("/auth/register");
      |                    ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  77  | 
  78  |         await expect(page.locator("[data-testid=email]")).toBeVisible();
  79  | 
  80  |         await page.fill("[data-testid=name]", "E2E Frontend User");
  81  |         await page.fill("[data-testid=email]", email);
  82  |         await page.fill("[data-testid=password]", password);
  83  |         await page.click("[data-testid=submit]");
  84  | 
  85  |         // Should land on the dashboard after successful registration.
  86  |         await page.waitForURL("/", { timeout: 10_000 });
  87  |         await expect(page).toHaveURL("/");
  88  |     });
  89  | 
  90  |     test("2. Populate profile in Settings", async ({ page }) => {
  91  |         await page.goto("/settings");
  92  | 
  93  |         await page.fill("[data-testid=field-address]", "1 Test Street, Bengaluru, Karnataka 560001");
  94  |         await page.fill("[data-testid=field-gstin]", "29ABCDE1234F1Z5");
  95  |         await page.fill("[data-testid=field-bank_name]", "Test Bank");
  96  |         await page.fill("[data-testid=field-account_number]", "123456789012");
  97  |         await page.fill("[data-testid=field-ifsc]", "TEST0001234");
  98  |         await page.fill("[data-testid=field-upi_id]", "e2etest@okbank");
  99  |         await page.fill("[data-testid=field-gmail_address]", "e2e_sender@example.com");
  100 |         await page.fill("[data-testid=field-invoice_prefix]", "E2E");
  101 | 
  102 |         await page.click("[data-testid=settings-save]");
  103 | 
  104 |         // Reload and confirm persistence, not just an optimistic UI update.
  105 |         await page.reload();
  106 |         await expect(page.locator("[data-testid=field-gstin]")).toHaveValue("29ABCDE1234F1Z5");
  107 | 
  108 |         // gmail_app_password must never come back pre-filled with a real secret.
  109 |         const appPasswordField = page.locator("[data-testid=field-gmail_app_password]");
  110 |         if (await appPasswordField.count() > 0) {
  111 |             await expect(appPasswordField).toHaveValue("");
  112 |         }
  113 |     });
  114 | 
  115 |     test("3. Upload a contract and wait for extraction", async ({ page }) => {
  116 |         await page.goto("/contracts/upload");
  117 | 
  118 |         const fileInput = page.locator("[data-testid=file-input]");
  119 |         await fileInput.setInputFiles(FIXTURE_PATH);
  120 | 
  121 |         // Upload flow should show feedback, not a frozen screen.
  122 |         await expect(page.locator("[data-testid=upload-status]")).toBeVisible({ timeout: 10_000 });
  123 | 
  124 |         // Should eventually navigate to the contract detail page once
  125 |         // extraction_status leaves "processing".
  126 |         await page.waitForURL(/\/contracts\/[a-zA-Z0-9]+$/, { timeout: UPLOAD_POLL_TIMEOUT });
  127 |         contractUrl = page.url();
  128 |         expect(contractUrl).toMatch(/\/contracts\/.+/);
  129 |     });
  130 | 
  131 |     test("4. Contract detail shows extracted milestones", async ({ page }) => {
  132 |         await page.goto(contractUrl);
  133 | 
  134 |         const cards = page.locator("[data-testid^=milestone-card-]");
  135 |         await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  136 |         const count = await cards.count();
  137 |         expect(count).toBeGreaterThan(0);
  138 |     });
  139 | 
  140 |     test("5. Mark a milestone as triggered", async ({ page }) => {
  141 |         await page.goto(contractUrl);
  142 | 
  143 |         const triggerBtn = page.locator("[data-testid^=trigger-btn-]").first();
  144 |         await expect(triggerBtn).toBeVisible({ timeout: 10_000 });
  145 | 
  146 |         // Capture which milestone this is so we can re-check its status pill.
  147 |         const testId = await triggerBtn.getAttribute("data-testid");
  148 |         const milestoneId = testId?.replace("trigger-btn-", "");
  149 | 
  150 |         await triggerBtn.click();
  151 | 
  152 |         const statusPill = page.locator(`[data-testid=milestone-status-${milestoneId}]`);
  153 |         await expect(statusPill).toHaveText(/TRIGGERED/i, { timeout: 10_000 });
  154 | 
  155 |         // Store for the next test via a global (Playwright serial mode shares
  156 |         // module state across tests in the same file).
  157 |         (globalThis as any).__triggeredMilestoneId = milestoneId;
  158 |     });
  159 | 
  160 |     test("6. Generate an invoice from the triggered milestone", async ({ page }) => {
  161 |         await page.goto(contractUrl);
  162 | 
  163 |         const milestoneId = (globalThis as any).__triggeredMilestoneId;
  164 |         const invoiceBtn = page.locator(`[data-testid=invoice-btn-${milestoneId}]`);
  165 |         await expect(invoiceBtn).toBeVisible({ timeout: 10_000 });
  166 |         await invoiceBtn.click();
  167 | 
  168 |         // Should navigate to the milestone detail / invoice pre-fill page.
  169 |         await page.waitForURL(/\/milestones\/.+/, { timeout: 10_000 });
  170 | 
  171 |         const amountField = page.locator("[data-testid=invoice-amount]");
  172 |         if (await amountField.count() > 0) {
  173 |             await amountField.fill("55000");
  174 |         }
  175 |         await page.click("[data-testid=invoice-submit]");
  176 | 
```