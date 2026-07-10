# Mock Amazon SP-API Financial Event Analyzer

## Project Overview

**Mock Amazon SP-API Financial Event Analyzer** is a focused demonstration project built to simulate Amazon Seller Central financial-event ingestion and deduction analysis.

The project uses a **mock SP-API-compatible service** instead of the real Amazon Selling Partner API because production SP-API access requires business registration, approval, roles, and seller authorization. The goal is to honestly simulate the integration patterns and business workflow that matter in a real SP-API system without depending on live Amazon access.

The project is designed around a practical business problem: Amazon sellers often struggle to understand why their actual payouts differ from what they expected to receive. These differences can come from marketplace fees, refunds, reimbursements, shortpays, promotional adjustments, FBA charges, and other deduction-like financial events.

This tool consumes a mock Amazon-style financial events API, normalizes seller financial data, detects suspicious payout-impacting events, and uses AI to generate clear explanations and suggested next actions.

The goal is not to claim production Amazon SP-API experience. The goal is to demonstrate understanding of Amazon marketplace financial workflows, SP-API-style integration patterns, and AI-assisted deduction visibility.

---

## Business Use Case

Amazon sellers receive payouts after Amazon deducts various fees and adjustments from order revenue. However, understanding the final payout can be difficult because financial activity is spread across multiple event types and line items.

A seller or finance operator may ask:

- Why is my payout lower than expected?
- Which orders had large or unusual fees?
- Were there refunds or reimbursements affecting this settlement?
- Are there unexplained deductions that need review?
- Which financial events should the finance team investigate first?

This project helps answer those questions by ingesting Amazon-style financial events and converting them into a more understandable, investigation-friendly view.

---

## Example Scenario

A seller expects to receive payment for an order, but the final settled amount is lower than expected.

The difference may be caused by:

- Amazon referral fees
- FBA fulfillment fees
- Refunds
- Chargebacks
- Promotional rebates
- Reimbursement adjustments
- Other marketplace deductions

Instead of manually reading raw Seller Central-style financial data, the tool highlights the relevant financial events and generates a business-friendly AI explanation.

Example output:

> This order has a lower net payout due to a refund event and multiple fee components. The refund appears valid, but the additional adjustment should be reviewed before closing the reconciliation.

---

## Product Goal

The product goal is to provide a lightweight investigation layer on top of Amazon Seller Central-style financial data.

It should help a seller, finance operator, or revenue recovery team quickly identify financial events that may need attention.

The product does four main things:

1. Simulates Amazon SP-API-style financial-event endpoints
2. Ingests and normalizes financial events from the mock API
3. Detects suspicious payout-impacting events using deterministic rules
4. Uses AI to explain suspicious or important financial activity

---

## Core User

The primary user is a finance or operations person at an Amazon seller brand.

This user may not be deeply technical, but they need to understand why Amazon payouts changed and which events need investigation.

Typical users could include:

- Marketplace finance teams
- Seller operations teams
- Revenue recovery analysts
- Founders/operators of Amazon seller businesses
- Deduction management teams

---

## Product Architecture

The project is split into two small services.

```text
Mock SP-API Service
   ↓
Analyzer Backend
   ↓
Database
   ↓
AI Explanation Service
   ↓
Dashboard
```

### 1. Mock SP-API Service

The mock service behaves like a simplified Amazon SP-API provider.

It exposes Amazon-style endpoints for orders and financial events, while also simulating real integration concerns such as token auth, pagination, throttling, and occasional failures.

### 2. Analyzer Application

The analyzer application consumes the mock SP-API service, stores raw and normalized financial events, detects suspicious deductions, and generates AI explanations.

---

## Key Features

### 1. Mock SP-API-Compatible Service

The project includes a mock API service that simulates Amazon SP-API patterns.

Initial endpoints:

```text
POST /auth/o2/token
GET /orders/v0/orders
GET /orders/v0/orders/:orderId
GET /finances/v0/financialEvents
GET /finances/v0/orders/:orderId/financialEvents
```

The mock service should support:

- Access-token-based authorization
- Token expiry simulation
- Pagination using `nextToken`
- Date range filters
- Marketplace ID filters
- Rate-limit responses using HTTP 429
- Occasional 500 errors for retry testing
- Realistic financial event payloads

This allows the analyzer app to demonstrate production-like integration behavior without requiring real Amazon credentials.

---

### 2. Financial Event Ingestion

The analyzer fetches financial events from the mock SP-API service and stores the raw response for traceability.

This is useful because financial data often needs to be audited later.

Stored data includes:

- Raw API response
- Event type
- Event date
- Order ID, where available
- Fee components
- Refund components
- Reimbursement components
- Net financial impact

---

### 3. Normalized Financial Event View

Raw financial-event responses can be difficult to read directly.

The project converts them into a simplified event table that shows:

- Order ID
- Event type
- Amount
- Fee category
- Refund amount
- Reimbursement amount
- Net impact
- Possible issue type

This gives users a quick way to scan financial events without reading raw JSON.

---

### 4. Suspicious Event Detection

The system applies lightweight rule-based checks to identify events that may need review.

Example signals:

- High marketplace fee
- Refund present
- Negative net payout
- Multiple fee components on a single order
- Reimbursement event present
- Unexplained adjustment
- Large deduction compared to item value

The goal is not to make final accounting decisions automatically. The goal is to prioritize events that deserve human review.

---

### 5. AI-Generated Explanation

For each suspicious financial event, the system sends structured event data to an AI model and generates a concise explanation.

The AI explains:

- What happened
- Why the event may matter
- Which fee/refund/adjustment contributed to the payout change
- What the seller should review next

Example AI output:

```json
{
  "summary": "This order has a lower net payout due to a refund and multiple fee deductions.",
  "possible_issue": "The refund appears expected, but the additional adjustment should be reviewed.",
  "suggested_action": "Check the refund reason and compare the adjustment against the settlement report.",
  "confidence": "medium"
}
```

---

### 6. Dashboard

The dashboard provides a simple view of financial events and potential deduction issues.

Suggested dashboard sections:

- Total events synced
- Total negative financial impact
- Number of suspicious events
- Events grouped by type
- Table of flagged events
- AI explanation for each flagged event

The dashboard is intentionally lightweight and demo-focused.

---

## MVP Scope

The MVP focuses on the most important workflow: consuming an SP-API-style service and explaining Amazon-style financial events.

### Included in MVP

- Mock SP-API service
- OAuth-style token endpoint
- Token validation middleware
- Paginated financial events endpoint
- Basic throttling simulation
- Analyzer backend client
- Financial event sync flow
- Raw response storage
- Event normalization
- Suspicious event detection using simple rules
- AI-generated explanations
- Simple dashboard table
- README and demo walkthrough

### Not Included in MVP

- Real Amazon SP-API integration
- Real Seller Central authorization
- Production app approval
- Full reconciliation engine
- Multi-seller support
- Full settlement report ingestion
- Production-grade accounting logic
- Automated dispute submission
- Complex role-based access control
- Scheduled background sync

These can be added later if the project needs to evolve beyond a demo.

---

## Product Flow

```text
Analyzer app requests access token from mock SP-API
        ↓
Mock SP-API returns short-lived access token
        ↓
Analyzer app calls mock financial-events endpoint
        ↓
Mock SP-API returns paginated financial events
        ↓
Analyzer handles pagination, throttling, and retries
        ↓
Raw financial events are stored
        ↓
Events are normalized into a readable table
        ↓
Rule-based checks identify suspicious events
        ↓
AI generates explanation and suggested next action
        ↓
User reviews financial events in dashboard
```

---

## AI Role in the Product

AI is not responsible for performing core calculations.

The backend should calculate and detect suspicious signals using deterministic logic. AI is used only to explain the event in plain English and suggest what the user should review next.

This keeps the product more reliable because financial calculations should be deterministic, auditable, and reproducible.

AI is used for:

- Explaining complex financial events
- Summarizing payout impact
- Suggesting investigation steps
- Drafting review notes
- Making raw financial data easier to understand

---

## Example AI Prompt

```text
You are an Amazon marketplace financial reconciliation assistant.

Given this Amazon-style financial event data, explain:
1. What happened
2. Why it may matter to the seller
3. Which components affected the payout
4. What the seller should review next

Keep the explanation concise, practical, and business-friendly.

Data:
{event_json}
```

---

## Example AI Response

```json
{
  "summary": "The order payout was reduced by referral fees, FBA fees, and a refund event.",
  "business_reason": "The refund created a negative adjustment, while the FBA and referral fees further reduced the final settlement amount.",
  "suggested_action": "Verify whether the refund was customer-initiated and compare the fee values against the settlement view.",
  "confidence": "medium"
}
```

---

## Technical Overview

Suggested stack:

- Next.js
- TypeScript
- Node.js / Hono.js
- SQLite or PostgreSQL
- Mock SP-API service
- OpenAI, Claude, or Gemini for AI explanations

Suggested structure:

```text
apps/
  mock-sp-api/
    src/
      auth/
      orders/
      finances/
      middlewares/
      data/
  analyzer-dashboard/
    src/
      app/
      server/
        api-client/
        financial-events/
        ai/
        db/
packages/
  shared-types/
```

For a faster implementation, this can also be built in a single app with separate route groups for the mock API and analyzer backend.

---

## Mock API Behavior

The mock API should deliberately simulate real-world external API integration constraints.

### Auth Simulation

```text
POST /auth/o2/token
```

Returns:

```json
{
  "access_token": "mock_access_token",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Pagination Simulation

```text
GET /finances/v0/financialEvents?postedAfter=2026-07-01&postedBefore=2026-07-10&nextToken=abc
```

Returns:

```json
{
  "payload": {
    "FinancialEvents": [...],
    "NextToken": "next_page_token"
  }
}
```

### Throttling Simulation

The mock API can occasionally return:

```json
{
  "errors": [
    {
      "code": "TooManyRequests",
      "message": "Rate limit exceeded"
    }
  ]
}
```

with HTTP status `429`.

The analyzer client should retry with backoff.

---

## Data Model

### Financial Event

```text
id
external_event_id
order_id
event_type
event_date
marketplace_id
raw_payload
principal_amount
fee_amount
refund_amount
reimbursement_amount
net_amount
created_at
```

### Suspicious Event

```text
id
financial_event_id
issue_type
severity
reason
amount_at_risk
ai_summary
ai_suggested_action
confidence
created_at
```

---

## Issue Types

Initial issue categories:

```text
HIGH_FEE
REFUND_IMPACT
NEGATIVE_NET_PAYOUT
REIMBURSEMENT_PRESENT
UNEXPLAINED_ADJUSTMENT
MULTIPLE_FEE_COMPONENTS
UNKNOWN
```

---

## Success Criteria

The project is successful if it demonstrates:

- Understanding of SP-API-style authentication and API usage
- Ability to consume paginated financial data from an external service
- Handling of token expiry, throttling, and retries
- Understanding of Amazon seller financial events
- Clean normalization of messy API responses
- Basic deduction/fee issue detection
- AI-generated business explanation
- Clear mapping to marketplace revenue recovery use cases

---

## Future Enhancements

Possible next steps:

- Replace mock API with real Amazon SP-API when business registration is available
- Add real LWA authorization flow
- Add Orders API integration
- Join order details with financial events
- Add Reports API settlement report ingestion
- Implement async report request and polling
- Add idempotent scheduled sync
- Add multi-marketplace support
- Add full expected-vs-actual payout reconciliation
- Generate dispute packet drafts
- Add export to CSV

---

