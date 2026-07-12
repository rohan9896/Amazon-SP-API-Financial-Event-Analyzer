# Reconciliation API — API Reference

Consumer-facing HTTP API for the Amazon SP-API Financial Event Analyzer. It wraps the [`reconciliation-engine`](../reconciliation-engine), fetches data from the mock [`sp-api-service`](../sp-api-service), normalizes it, runs reconciliation, and serves on-demand Gemini explanations.

**Base URL:** `http://localhost:4000` (configurable via `PORT` env var)

**Designed for:** browser SPAs (CORS enabled on `/api/*`). The frontend does **not** handle Amazon LWA tokens — this server talks to the mock SP-API internally.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture & caching](#architecture--caching)
3. [Utility](#utility)
   - [GET /](#1-service-root)
   - [GET /health](#2-health-check)
4. [Data endpoints](#data-endpoints)
   - [GET /api/orders](#3-list-orders)
   - [GET /api/finances](#4-list-finance-lines)
5. [Reconciliation](#reconciliation)
   - [GET /api/reconcile](#5-run-reconciliation)
6. [Explanations](#explanations)
   - [POST /api/explain/:orderId](#6-explain-an-order)
7. [Response schemas](#response-schemas)
8. [Error reference](#error-reference)
9. [Configuration](#configuration)
10. [Frontend integration notes](#frontend-integration-notes)

---

## Quick Start

```bash
# Terminal 1 — mock Amazon SP-API (must be running first)
cd sp-api-service
cp .env.example .env          # edit credentials if desired
pnpm dev                      # http://localhost:3000

# Terminal 2 — this API
cd reconciliation-api
cp .env.example .env
# IMPORTANT: SP_API_CLIENT_ID / SP_API_CLIENT_SECRET must match sp-api-service/.env
pnpm dev                      # http://localhost:4000 (builds reconciliation-engine first)

# Smoke test — no auth header needed
curl -s http://localhost:4000/health | jq .
curl -s http://localhost:4000/api/orders | jq '.orders | length'
curl -s http://localhost:4000/api/reconcile | jq 'map(select(.flags | length > 0)) | length'

# Explain a flagged order (requires GEMINI_API_KEY in .env)
curl -s -X POST http://localhost:4000/api/explain/444-5678901-2345678 | jq .
```

---

## Architecture & caching

```text
Browser SPA  --HTTP+CORS-->  reconciliation-api (:4000)
                                    |
                                    | imports reconciliation-engine
                                    v
                         SpApiClient --> sp-api-service (:3000)
                         GeminiClient --> Google Gemini (explain only)
```

### What this API does internally

On the first request (or after cache expiry), the server:

1. Authenticates with `sp-api-service` (`POST /auth/o2/token`)
2. Fetches all **Shipped** orders + order items (paginated internally)
3. Fetches all financial events (paginated internally)
4. Normalizes both datasets into engine-native types
5. Runs `reconcile()` and caches the result

Subsequent requests within the TTL reuse the cached dataset — so `/api/orders`, `/api/finances`, `/api/reconcile`, and `/api/explain` all see the same snapshot.

| Setting | Default | Effect |
|---|---|---|
| `DATA_CACHE_TTL_MS` | `30000` (30s) | How long the fetched dataset is reused |
| `GET /api/reconcile?refresh=true` | — | Forces a re-fetch from the mock SP-API and refreshes the shared cache for all endpoints |

### CORS

CORS is enabled on `/api/*` for origins listed in `CORS_ORIGIN` (default `http://localhost:5173`). Set `CORS_ORIGIN=*` to allow all origins in development.

`/health` and `/` are not CORS-wrapped — call them from the same origin or via a dev proxy.

### Authentication

**No auth is required on this API.** Amazon LWA credentials (`SP_API_CLIENT_ID`, `SP_API_CLIENT_SECRET`) are server-side only. The browser never sees them.

---

## Utility

### 1. Service root

**`GET /`**

Returns service metadata and a list of available endpoints.

#### Request

```bash
curl -s http://localhost:4000/
```

#### Response — 200 OK

```json
{
  "service": "reconciliation-api",
  "status": "running",
  "endpoints": [
    "GET /health",
    "GET /api/orders",
    "GET /api/finances",
    "GET /api/reconcile",
    "POST /api/explain/:orderId"
  ]
}
```

---

### 2. Health check

**`GET /health`**

#### Request

```bash
curl -s http://localhost:4000/health
```

#### Response — 200 OK

```json
{
  "status": "ok",
  "uptime": 42.5
}
```

---

## Data endpoints

These return normalized, engine-native shapes — not raw Amazon SP-API responses. Line items are **embedded** in each order (no separate order-items call).

Only **`Shipped`** orders are included. `Canceled` and `Pending` orders from the mock seed data are excluded because the reconciliation engine only evaluates shipped orders.

---

### 3. List orders

**`GET /api/orders`**

Returns all normalized orders and any per-order normalization warnings.

#### Request

```bash
curl -s http://localhost:4000/api/orders
```

#### Response — 200 OK

```json
{
  "orders": [
    {
      "orderId": "111-2345678-9012345",
      "orderStatus": "Shipped",
      "marketplaceId": "ATVPDKIKX0DER",
      "items": [
        {
          "sellerSKU": "WIDGET-PRO-001",
          "quantityOrdered": 1,
          "itemPrice": 89.99,
          "itemTax": 7.65,
          "shippingPrice": 0
        }
      ]
    }
  ],
  "warnings": {}
}
```

#### Notes

- `itemPrice` is the **line total** (already quantity-extended), matching Amazon Orders API semantics.
- `warnings` is a map of `orderId → string[]` for missing fields treated as `0` during normalization. Empty `{}` means no warnings.
- There is **no pagination** — the full dataset is returned in one response (~11 shipped orders in the seed data).

---

### 4. List finance lines

**`GET /api/finances`**

Returns all financial events flattened into individual money-movement lines.

#### Request

```bash
curl -s http://localhost:4000/api/finances
```

#### Response — 200 OK

```json
{
  "financeLines": [
    {
      "eventId": "ShipmentEventList:2026-05-28T10:15:00.000Z:111-2345678-9012345:Principal:0",
      "orderId": "111-2345678-9012345",
      "sellerSKU": "WIDGET-PRO-001",
      "eventCategory": "ShipmentEventList",
      "lineType": "Principal",
      "amount": 89.99,
      "currency": "USD",
      "postedDate": "2026-05-28T10:15:00.000Z"
    },
    {
      "eventId": "ShipmentEventList:2026-05-28T10:15:00.000Z:111-2345678-9012345:Commission:0",
      "orderId": "111-2345678-9012345",
      "sellerSKU": "WIDGET-PRO-001",
      "eventCategory": "ShipmentEventList",
      "lineType": "Commission",
      "amount": -13.5,
      "currency": "USD",
      "postedDate": "2026-05-28T10:15:00.000Z"
    }
  ]
}
```

#### Notes

- Amounts are **signed**: positive = money in, negative = money out (fees, refunds, chargebacks).
- `lineType` values include `Principal`, `Commission`, `Tax`, `FBAPerUnitFulfillmentFee`, `Chargeback`, `GuaranteeClaim`, `FBAInventoryReimbursement`, etc.
- Some adjustment lines may have no `orderId` but carry a `sellerSKU` instead.
- There is **no pagination** — all lines are returned at once (~71 lines in the seed data).

---

## Reconciliation

### 5. Run reconciliation

**`GET /api/reconcile`**

Runs (or returns cached) the full reconciliation report: one record per shipped order with expected revenue, actual settled amount, discrepancy, flags, and itemized finance lines.

#### Request

```bash
# Use cached data (default, within TTL)
curl -s http://localhost:4000/api/reconcile

# Force a fresh fetch from the mock SP-API
curl -s "http://localhost:4000/api/reconcile?refresh=true"
```

#### Query parameters

| Parameter | Type | Description |
|---|---|---|
| `refresh` | `true` / omitted | When `true`, bypasses the cache and re-fetches from `sp-api-service`. Also refreshes data for `/api/orders` and `/api/finances`. |

#### Response — 200 OK

Returns a JSON **array** of reconciliation records.

```json
[
  {
    "orderId": "444-5678901-2345678",
    "expectedRevenue": 101.97,
    "actualSettled": -9,
    "discrepancy": -110.97,
    "flags": ["shortpay"],
    "flagMessages": ["Underpaid by $90.00"],
    "financeLines": [
      {
        "eventId": "ShipmentEventList:2026-06-07T16:45:00.000Z:444-5678901-2345678:Principal:0",
        "orderId": "444-5678901-2345678",
        "sellerSKU": "ACCESSORY-004",
        "eventCategory": "ShipmentEventList",
        "lineType": "Principal",
        "amount": 29.97,
        "currency": "USD",
        "postedDate": "2026-06-07T16:45:00.000Z"
      },
      {
        "eventId": "ChargebackEventList:2026-06-10T13:30:00.000Z:444-5678901-2345678:Chargeback:0",
        "orderId": "444-5678901-2345678",
        "eventCategory": "ChargebackEventList",
        "lineType": "Chargeback",
        "amount": -29.97,
        "currency": "USD",
        "postedDate": "2026-06-10T13:30:00.000Z"
      }
    ],
    "warnings": []
  }
]
```

#### Field reference

| Field | Meaning |
|---|---|
| `expectedRevenue` | What the seller should net: items + shipping + tax − 15% commission |
| `actualSettled` | Sum of all joined finance lines for this order |
| `discrepancy` | `actualSettled − expectedRevenue`. **Negative = underpaid overall** |
| `flags` | `shortpay`, `no_settlement`, or empty |
| `flagMessages` | Human-readable flag text. Shortpay messages report the **principal gap**, which can differ from `discrepancy` |
| `financeLines` | Every finance line joined to this order (for drill-down) |

#### Expected flags on seed data

| Order ID | Flag | Why |
|---|---|---|
| `222`, `333`, `444`, `555`, `777`, `999` | `shortpay` | Principal settled below expected |
| `200`, `201` | `no_settlement` | Zero finance lines |
| `111`, `222` (clean), `666`, `888` | *(none)* | Within tolerance or non-principal losses |

---

## Explanations

### 6. Explain an order

**`POST /api/explain/:orderId`**

Generates a seller-readable natural-language explanation for a single reconciliation record via Google Gemini. This is a **separate, on-demand** call — slow and paid — so the reconcile table can render instantly without waiting for the LLM.

#### Request

```bash
curl -s -X POST http://localhost:4000/api/explain/444-5678901-2345678
```

No request body. The server looks up the order in the cached reconciliation report and sends the record to Gemini.

#### Response — 200 OK

Narrative fields come from Gemini. The `calculation` object is **computed in code** (not by the LLM) so formulas and amounts are always exact.

```json
{
  "orderId": "444-5678901-2345678",
  "headline": "Payment discrepancy detected for order 444-5678901-2345678",
  "summary": "Your order resulted in a total discrepancy of -110.97 compared to your expected revenue of 101.97.",
  "reason": "This order is flagged for a shortpay...",
  "evidence": ["..."],
  "recommendedAction": "Please review the chargeback details...",
  "confidence": "high",
  "calculation": {
    "formulas": {
      "expectedRevenue": "itemSubtotal + shippingTotal + taxTotal − (itemSubtotal × 0.15)",
      "actualSettled": "Σ(financeLine.amount for all lines joined to the order)",
      "discrepancy": "actualSettled − expectedRevenue",
      "principalGap": "Σ(Principal amounts) − Σ(itemPrice)"
    },
    "expected": {
      "commissionRate": 0.15,
      "itemSubtotal": 119.97,
      "shippingTotal": 0,
      "taxTotal": 0,
      "commissionFee": 18,
      "expectedRevenue": 101.97,
      "steps": [
        "Item subtotal (Σ itemPrice) = $119.97",
        "Commission fee = itemSubtotal × 0.15 = $18.00",
        "expectedRevenue = $119.97 + $0.00 + $0.00 − $18.00 = $101.97"
      ]
    },
    "actual": {
      "lines": [
        { "label": "Shipment · Principal", "lineType": "Principal", "amount": 29.97 },
        { "label": "Shipment · Commission", "lineType": "Commission", "amount": -4.5 },
        { "label": "Chargeback · Chargeback", "lineType": "Chargeback", "amount": -29.97 }
      ],
      "credits": 29.97,
      "debits": -34.47,
      "actualSettled": -9,
      "steps": ["..."]
    },
    "discrepancy": {
      "value": -110.97,
      "meaning": "underpaid",
      "steps": [
        "discrepancy = actualSettled − expectedRevenue = $-9.00 − $101.97 = $-110.97"
      ]
    },
    "principal": {
      "expectedPrincipal": 119.97,
      "actualPrincipal": 29.97,
      "principalGap": -90,
      "shortpayTolerance": 0.5,
      "shortpayTriggered": true,
      "steps": ["..."]
    }
  }
}
```

#### Error — 404 Order not found

Returned when the `orderId` is not in the current reconciliation report (e.g. a Canceled/Pending order, or a typo).

```json
{
  "error": "Order 999-0000000-0000000 not found in the reconciliation report"
}
```

#### Error — 502 LLM failure

Returned when the Gemini API call fails or returns unparseable output. **There is no templated fallback.**

```json
{
  "error": "Failed to generate explanation",
  "detail": "Gemini request failed (429): ..."
}
```

#### Error — 503 Explanations unavailable

Returned when `GEMINI_API_KEY` is not configured on the server. Reconciliation still works; only explanations are disabled.

```json
{
  "error": "Explanations unavailable: GEMINI_API_KEY is not configured on the server"
}
```

#### Notes

- Requires `GEMINI_API_KEY` in `reconciliation-api/.env` (separate from SP-API credentials).
- Default model: `gemini-3.1-flash-lite` (configurable via `GEMINI_MODEL`).
- The LLM is instructed **not to recalculate** amounts — it narrates numbers already in the reconciliation record.
- Call this endpoint **per order**, only when the user asks for an explanation (e.g. clicking a row in the reconcile table).

---

## Response schemas

### `ReconciliationOrder`

```ts
{
  orderId: string;
  orderStatus: string;       // always "Shipped" in current dataset
  marketplaceId: string;
  items: {
    sellerSKU: string;
    quantityOrdered: number;
    itemPrice: number;       // line total (USD)
    itemTax: number;
    shippingPrice: number;
  }[];
}
```

### `ReconciliationFinanceLine`

```ts
{
  eventId: string;           // synthetic, for de-duplication
  orderId?: string;
  sellerSKU?: string;
  eventCategory: string;     // e.g. "ShipmentEventList", "RefundEventList"
  lineType: string;          // e.g. "Principal", "Commission", "Chargeback"
  amount: number;            // signed USD
  currency: string;
  postedDate: string;        // ISO 8601
}
```

### `ReconciliationRecord`

```ts
{
  orderId: string;
  expectedRevenue: number;
  actualSettled: number;
  discrepancy: number;       // negative = underpaid
  flags: ("shortpay" | "no_settlement")[];
  flagMessages: string[];
  financeLines: ReconciliationFinanceLine[];
  warnings: string[];
}
```

### `SellerExplanation`

```ts
{
  orderId: string;
  headline: string;
  summary: string;
  reason: string;
  evidence: string[];
  recommendedAction: string;
  confidence: "high" | "medium" | "low";
  calculation: {
    formulas: { expectedRevenue; actualSettled; discrepancy; principalGap };
    expected: { itemSubtotal, shippingTotal, taxTotal, commissionFee, expectedRevenue, steps[] };
    actual: { lines[], credits, debits, actualSettled, steps[] };
    discrepancy: { value, meaning, steps[] };
    principal: { expectedPrincipal, actualPrincipal, principalGap, shortpayTriggered, steps[] };
  };
}
```

`calculation` is always attached by the server (deterministic). Narrative fields come from Gemini.
---

## Error reference

| Status | When | Response shape |
|---|---|---|
| `200` | Success | Endpoint-specific JSON body |
| `404` | Unknown `orderId` on explain | `{ "error": "Order ... not found ..." }` |
| `502` | Gemini API failure or bad output | `{ "error": "Failed to generate explanation", "detail": "..." }` |
| `503` | `GEMINI_API_KEY` not set | `{ "error": "Explanations unavailable: ..." }` |
| `500` | Unexpected server error (e.g. mock SP-API down, credential mismatch) | `{ "error": "Internal server error", "detail": "..." }` |

### Common `500` causes

| Symptom in `detail` | Fix |
|---|---|
| `SP-API request failed (401)` | `SP_API_CLIENT_ID` / `SP_API_CLIENT_SECRET` in `reconciliation-api/.env` don't match `sp-api-service/.env` |
| `ECONNREFUSED` / fetch failed | `sp-api-service` is not running on `SP_API_BASE_URL` |
| `SP-API request failed (429)` | Rate limit hit during cache refresh — retry after a few seconds |

---

## Configuration

All settings are in `reconciliation-api/.env` (see `.env.example`).

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Server listen port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed SPA origin(s), comma-separated, or `*` |
| `SP_API_BASE_URL` | `http://localhost:3000` | Mock SP-API base URL |
| `SP_API_CLIENT_ID` | — | Must match `CLIENT_ID` in `sp-api-service/.env` |
| `SP_API_CLIENT_SECRET` | — | Must match `CLIENT_SECRET` in `sp-api-service/.env` |
| `COMMISSION_RATE` | `0.15` | Flat referral-fee assumption (15%) |
| `SHORTPAY_TOLERANCE` | `0.50` | Min principal gap ($) before flagging shortpay |
| `CREATED_AFTER` | `2020-01-01T00:00:00Z` | Order fetch start date (passed to mock Orders API) |
| `DATA_CACHE_TTL_MS` | `30000` | In-memory cache TTL in milliseconds |
| `GEMINI_API_KEY` | *(none)* | Google Gemini key — required only for explain |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | Gemini model for explanations |

`CLIENT_ID` / `CLIENT_SECRET` are accepted as aliases for the `SP_API_*` variants (same names as `sp-api-service`).

---

## Frontend integration notes

Recommended SPA call sequence:

```text
1. GET  /api/orders          → populate Orders tab/table
2. GET  /api/finances        → populate Finances tab/table
3. GET  /api/reconcile       → user clicks "Reconcile" → populate results table
4. POST /api/explain/:id     → user clicks "Explain" on a flagged row → show modal/panel
```

**Do not call `sp-api-service` from the browser.** It has no CORS and requires exposing `client_secret`. This API handles auth internally.

**Vite dev proxy (optional alternative to CORS):**

```ts
// vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:4000',
    '/health': 'http://localhost:4000',
  },
}
```

**Handling explain errors in the UI:**

| Status | UI behavior |
|---|---|
| `503` | Hide or disable "Explain" button; show "Explanations not configured" |
| `502` | Show the `detail` message; offer retry |
| `404` | Should not happen if explaining from the reconcile table — log and show generic error |

---

## Related docs

- [../docs/RECONCILIATION-FLOW.md](../docs/RECONCILIATION-FLOW.md) — full system flow, glossary, and design decisions
- [../sp-api-service/API.md](../sp-api-service/API.md) — mock Amazon SP-API reference (backend use only)
- [../stories/0006-reconciliation-api.md](../stories/0006-reconciliation-api.md) — implementation story and requirements
