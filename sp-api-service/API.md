# Mock SP-API Service — API Reference

This document covers every endpoint exposed by the mock service, with curl examples and annotated sample responses.

**Base URL:** `http://localhost:3000` (configurable via `PORT` env var)

---

## Table of Contents

1. [Authentication](#authentication)
   - [POST /auth/o2/token — client_credentials](#1-get-an-access-token-client-credentials)
   - [POST /auth/o2/token — refresh_token](#2-refresh-an-access-token)
2. [Orders API](#orders-api)
   - [GET /orders/v0/orders](#3-list-orders)
   - [GET /orders/v0/orders/:orderId/orderItems](#4-get-order-items)
3. [Finances API](#finances-api)
   - [GET /finances/v0/financialEvents](#5-list-financial-events)
4. [Utility](#utility)
   - [GET /health](#6-health-check)
5. [Error Reference](#error-reference)
6. [Seed Data Catalog](#seed-data-catalog)

---

## Quick Start

```bash
# 1. Start the service
cd sp-api-service
cp .env.example .env   # edit credentials if desired
pnpm dev               # or: pnpm start / pnpm docker:up

# 2. Get a token (paste your CLIENT_ID and CLIENT_SECRET from .env)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/o2/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"amzn1.application-oa2-client.mockspapi","client_secret":"mock_client_secret"}' \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# 3. Use the token
curl -s "http://localhost:3000/orders/v0/orders?CreatedAfter=2020-01-01T00:00:00Z" \
  -H "x-amz-access-token: $TOKEN" | jq .
```

---

## Authentication

All business endpoints require a valid, non-expired access token in the `x-amz-access-token` request header. This mirrors the real Amazon SP-API's LWA (Login With Amazon) auth flow.

Tokens are **in-memory only** — they are lost on server restart. TTL is controlled by `ACCESS_TOKEN_TTL_SECONDS` (default: `3600` seconds).

---

### 1. Get an Access Token (client_credentials)

**`POST /auth/o2/token`**

Accepts `application/json` or `application/x-www-form-urlencoded`.

#### Request

```bash
curl -s -X POST http://localhost:3000/auth/o2/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "amzn1.application-oa2-client.mockspapi",
    "client_secret": "mock_client_secret"
  }'
```

Form-encoded alternative:

```bash
curl -s -X POST http://localhost:3000/auth/o2/token \
  -d "grant_type=client_credentials&client_id=amzn1.application-oa2-client.mockspapi&client_secret=mock_client_secret"
```

#### Response — 200 OK

```json
{
  "access_token": "Atza|abc123xyz...",
  "refresh_token": "Atzr|mock_refresh_token",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### Error — 401 Invalid credentials

```json
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```

#### Error — 400 Missing fields

```json
{
  "error": "invalid_request",
  "error_description": "Missing or invalid token request parameters"
}
```

---

### 2. Refresh an Access Token

**`POST /auth/o2/token`**

#### Request

```bash
curl -s -X POST http://localhost:3000/auth/o2/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "client_id": "amzn1.application-oa2-client.mockspapi",
    "client_secret": "mock_client_secret",
    "refresh_token": "Atzr|mock_refresh_token"
  }'
```

#### Response — 200 OK

Same shape as `client_credentials` response — a fresh `access_token` with a new TTL.

```json
{
  "access_token": "Atza|newToken...",
  "refresh_token": "Atzr|mock_refresh_token",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### Error — 400 Bad refresh token

```json
{
  "error": "invalid_grant",
  "error_description": "Refresh token is invalid"
}
```

---

## Orders API

Mirrors Amazon SP-API `GET /orders/v0/orders` and `GET /orders/v0/orders/{orderId}/orderItems`.

**Rate limiting (NF-2):** Both endpoints share a sliding-window counter. After `ORDERS_RATE_LIMIT_THRESHOLD` requests within `ORDERS_RATE_LIMIT_WINDOW_MS` milliseconds, subsequent requests return `429`. Defaults: 5 requests / 10 seconds.

**Response headers on success:**

| Header | Value |
|---|---|
| `x-amzn-RateLimit-Limit` | Value of `ORDERS_RATE_LIMIT_THRESHOLD` |
| `x-amzn-RequestId` | Random UUID per request |

---

### 3. List Orders

**`GET /orders/v0/orders`**

Returns orders whose `PurchaseDate` falls within the specified date range, sorted ascending by `PurchaseDate`.

#### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `CreatedAfter` | ISO 8601 string | **Yes** | Return orders created at or after this date |
| `CreatedBefore` | ISO 8601 string | No | Return orders created before this date |
| `OrderStatuses` | comma-separated string | No | Filter by status. Values: `Shipped`, `Canceled`, `Pending`, `Unshipped`, `PartiallyShipped` |
| `MarketplaceIds` | comma-separated string | No | Filter by marketplace ID (e.g. `ATVPDKIKX0DER`) |
| `MaxResultsPerPage` | integer 1–100 | No | Page size (default: `100`) |
| `NextToken` | string | No | Pagination cursor from previous response |

#### Example — All orders since 2020

```bash
curl -s "http://localhost:3000/orders/v0/orders?CreatedAfter=2020-01-01T00:00:00Z" \
  -H "x-amz-access-token: $TOKEN" | jq .
```

#### Example — Only shipped orders with pagination

```bash
# Page 1 — 3 results
curl -s "http://localhost:3000/orders/v0/orders?CreatedAfter=2020-01-01T00:00:00Z&OrderStatuses=Shipped&MaxResultsPerPage=3" \
  -H "x-amz-access-token: $TOKEN"
```

#### Example — Multiple statuses (comma-separated)

```bash
curl -s "http://localhost:3000/orders/v0/orders?CreatedAfter=2020-01-01T00:00:00Z&OrderStatuses=Shipped,Pending" \
  -H "x-amz-access-token: $TOKEN"
```

#### Example — Follow a NextToken

```bash
# Capture the next token from page 1
NEXT=$(curl -s "http://localhost:3000/orders/v0/orders?CreatedAfter=2020-01-01T00:00:00Z&MaxResultsPerPage=3" \
  -H "x-amz-access-token: $TOKEN" \
  | jq -r '.payload.NextToken')

# Fetch page 2
curl -s "http://localhost:3000/orders/v0/orders?CreatedAfter=2020-01-01T00:00:00Z&MaxResultsPerPage=3&NextToken=$NEXT" \
  -H "x-amz-access-token: $TOKEN" | jq .
```

#### Response — 200 OK (with NextToken)

```json
{
  "payload": {
    "Orders": [
      {
        "AmazonOrderId": "111-2345678-9012345",
        "PurchaseDate": "2026-05-27T09:00:00.000Z",
        "LastUpdateDate": "2026-05-26T10:15:00.000Z",
        "OrderStatus": "Shipped",
        "FulfillmentChannel": "AFN",
        "MarketplaceId": "ATVPDKIKX0DER",
        "OrderTotal": { "CurrencyCode": "USD", "Amount": "97.64" },
        "NumberOfItemsShipped": 1,
        "NumberOfItemsUnshipped": 0
      },
      {
        "AmazonOrderId": "222-3456789-0123456",
        "PurchaseDate": "2026-05-30T13:00:00.000Z",
        "LastUpdateDate": "2026-05-29T14:30:00.000Z",
        "OrderStatus": "Shipped",
        "FulfillmentChannel": "AFN",
        "MarketplaceId": "ATVPDKIKX0DER",
        "OrderTotal": { "CurrencyCode": "USD", "Amount": "49.98" },
        "NumberOfItemsShipped": 2,
        "NumberOfItemsUnshipped": 0
      },
      {
        "AmazonOrderId": "333-4567890-1234567",
        "PurchaseDate": "2026-06-04T08:30:00.000Z",
        "LastUpdateDate": "2026-06-03T09:00:00.000Z",
        "OrderStatus": "Shipped",
        "FulfillmentChannel": "AFN",
        "MarketplaceId": "ATVPDKIKX0DER",
        "OrderTotal": { "CurrencyCode": "USD", "Amount": "162.74" },
        "NumberOfItemsShipped": 1,
        "NumberOfItemsUnshipped": 0
      }
    ],
    "NextToken": "eyJvIjozLCJjYSI6IjIwMjAtMDEtMDFUMDA6MDA6MDBaIiwibSI6M30"
  }
}
```

#### Response — 200 OK (last page — no NextToken)

```json
{
  "payload": {
    "Orders": [
      {
        "AmazonOrderId": "301-4444444-4444444",
        "PurchaseDate": "2026-07-11T16:00:00.000Z",
        "LastUpdateDate": "2026-07-11T16:00:00.000Z",
        "OrderStatus": "Pending",
        "FulfillmentChannel": "MFN",
        "MarketplaceId": "ATVPDKIKX0DER",
        "OrderTotal": { "CurrencyCode": "USD", "Amount": "75.00" },
        "NumberOfItemsShipped": 0,
        "NumberOfItemsUnshipped": 1
      }
    ]
  }
}
```

---

### 4. Get Order Items

**`GET /orders/v0/orders/:orderId/orderItems`**

Returns the line items for a specific order. For `Pending` orders, Amazon omits pricing fields (`ItemPrice`, `ShippingPrice`, `ItemTax`) since payment has not yet been authorized — this mock replicates that behavior.

#### Path Parameter

| Parameter | Description |
|---|---|
| `orderId` | Amazon order ID in 3-7-7 format, e.g. `111-2345678-9012345` |

#### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `MaxResultsPerPage` | integer 1–100 | No | Page size (default: `100`) |
| `NextToken` | string | No | Pagination cursor from previous response |

#### Example — Standard order

```bash
curl -s "http://localhost:3000/orders/v0/orders/111-2345678-9012345/orderItems" \
  -H "x-amz-access-token: $TOKEN" | jq .
```

#### Example — Multi-item order

```bash
curl -s "http://localhost:3000/orders/v0/orders/555-6789012-3456789/orderItems" \
  -H "x-amz-access-token: $TOKEN" | jq .
```

#### Example — Pending order (pricing omitted)

```bash
curl -s "http://localhost:3000/orders/v0/orders/301-4444444-4444444/orderItems" \
  -H "x-amz-access-token: $TOKEN" | jq .
```

#### Response — 200 OK (standard Shipped order)

```json
{
  "payload": {
    "AmazonOrderId": "111-2345678-9012345",
    "OrderItems": [
      {
        "ASIN": "B0WIDGET001",
        "SellerSKU": "WIDGET-PRO-001",
        "OrderItemId": "OI-1001",
        "Title": "Widget Pro",
        "QuantityOrdered": 1,
        "QuantityShipped": 1,
        "ItemPrice": { "CurrencyCode": "USD", "Amount": "89.99" },
        "ShippingPrice": { "CurrencyCode": "USD", "Amount": "0.00" },
        "ItemTax": { "CurrencyCode": "USD", "Amount": "7.65" }
      }
    ]
  }
}
```

#### Response — 200 OK (multi-item order 555)

```json
{
  "payload": {
    "AmazonOrderId": "555-6789012-3456789",
    "OrderItems": [
      {
        "ASIN": "B0BUNDLE005",
        "SellerSKU": "BUNDLE-005",
        "OrderItemId": "OI-1005A",
        "Title": "Value Bundle",
        "QuantityOrdered": 1,
        "QuantityShipped": 1,
        "ItemPrice": { "CurrencyCode": "USD", "Amount": "199.99" },
        "ShippingPrice": { "CurrencyCode": "USD", "Amount": "0.00" },
        "ItemTax": { "CurrencyCode": "USD", "Amount": "0.00" }
      },
      {
        "ASIN": "B0EXTRA005",
        "SellerSKU": "BUNDLE-005-EXTRA",
        "OrderItemId": "OI-1005B",
        "Title": "Bundle Add-on",
        "QuantityOrdered": 1,
        "QuantityShipped": 1,
        "ItemPrice": { "CurrencyCode": "USD", "Amount": "15.00" },
        "ShippingPrice": { "CurrencyCode": "USD", "Amount": "0.00" },
        "ItemTax": { "CurrencyCode": "USD", "Amount": "1.28" }
      }
    ]
  }
}
```

#### Response — 200 OK (Pending order — pricing omitted)

```json
{
  "payload": {
    "AmazonOrderId": "301-4444444-4444444",
    "OrderItems": [
      {
        "ASIN": "B0PENDING001",
        "SellerSKU": "PENDING-ITEM-001",
        "OrderItemId": "OI-3002",
        "Title": "Pending Item",
        "QuantityOrdered": 1,
        "QuantityShipped": 0
      }
    ]
  }
}
```

Note: `ItemPrice`, `ShippingPrice`, and `ItemTax` are intentionally absent. This is the real Amazon behavior.

#### Response — 404 Not Found

```json
{
  "errors": [
    {
      "code": "NotFound",
      "message": "Order 000-0000000-0000000 does not exist"
    }
  ]
}
```

---

## Finances API

Mirrors Amazon SP-API `GET /finances/v0/financialEvents`.

**Rate limit header on success:** `x-amzn-RateLimit-Limit: 0.5` (matching Amazon's real rate for this endpoint)

---

### 5. List Financial Events

**`GET /finances/v0/financialEvents`**

Returns settlement events (shipments, refunds, adjustments, service fees, chargebacks, guarantee claims) sorted ascending by `PostedDate`. All 32 seed events span roughly the past 50 days.

#### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `PostedAfter` | ISO 8601 string | No | Return events posted at or after this date. Required if `PostedBefore` is specified |
| `PostedBefore` | ISO 8601 string | No | Return events posted before this date |
| `MaxResultsPerPage` | integer 1–100 | No | Page size (default: `100`) |
| `NextToken` | string | No | Pagination cursor from previous response |

#### Example — All events (no date filter)

```bash
curl -s "http://localhost:3000/finances/v0/financialEvents" \
  -H "x-amz-access-token: $TOKEN" | jq .
```

#### Example — Date-filtered events

```bash
curl -s "http://localhost:3000/finances/v0/financialEvents?PostedAfter=2026-06-01T00:00:00Z&PostedBefore=2026-07-01T00:00:00Z" \
  -H "x-amz-access-token: $TOKEN" | jq .
```

#### Example — Paginated (5 at a time)

```bash
# Page 1
curl -s "http://localhost:3000/finances/v0/financialEvents?MaxResultsPerPage=5" \
  -H "x-amz-access-token: $TOKEN"

# Page 2 — replace <TOKEN_FROM_PAGE_1> with .payload.NextToken from above
curl -s "http://localhost:3000/finances/v0/financialEvents?MaxResultsPerPage=5&NextToken=<TOKEN_FROM_PAGE_1>" \
  -H "x-amz-access-token: $TOKEN"
```

#### Response — 200 OK

Events are grouped into their Amazon-defined list types. Only list types with at least one event in the current page are present.

```json
{
  "payload": {
    "FinancialEvents": {
      "ShipmentEventList": [
        {
          "AmazonOrderId": "111-2345678-9012345",
          "SellerOrderId": "SO-1001",
          "MarketplaceName": "Amazon.com",
          "PostedDate": "2026-05-26T10:15:00.000Z",
          "ShipmentItemList": [
            {
              "SellerSKU": "WIDGET-PRO-001",
              "OrderItemId": "OI-1001",
              "QuantityShipped": 1,
              "ItemChargeList": [
                { "ChargeType": "Principal", "ChargeAmount": { "CurrencyCode": "USD", "CurrencyAmount": 89.99 } },
                { "ChargeType": "Tax",       "ChargeAmount": { "CurrencyCode": "USD", "CurrencyAmount": 7.65 } }
              ],
              "ItemFeeList": [
                { "FeeType": "Commission",               "FeeAmount": { "CurrencyCode": "USD", "CurrencyAmount": -13.50 } },
                { "FeeType": "FBAPerUnitFulfillmentFee", "FeeAmount": { "CurrencyCode": "USD", "CurrencyAmount": -4.75 } }
              ]
            }
          ]
        }
      ],
      "RefundEventList": [
        {
          "AmazonOrderId": "333-4567890-1234567",
          "MarketplaceName": "Amazon.com",
          "PostedDate": "2026-06-05T11:00:00.000Z",
          "ShipmentItemAdjustmentList": [
            {
              "SellerSKU": "PREMIUM-KIT-003",
              "QuantityShipped": 1,
              "ItemChargeAdjustmentList": [
                { "ChargeType": "Principal", "ChargeAmount": { "CurrencyCode": "USD", "CurrencyAmount": -149.99 } },
                { "ChargeType": "Tax",       "ChargeAmount": { "CurrencyCode": "USD", "CurrencyAmount": -12.75 } }
              ],
              "ItemFeeAdjustmentList": [
                { "FeeType": "Commission", "FeeAmount": { "CurrencyCode": "USD", "CurrencyAmount": 22.50 } }
              ]
            }
          ]
        }
      ],
      "AdjustmentEventList": [
        {
          "AdjustmentType": "MiscAdjustment",
          "PostedDate": "2026-06-01T09:30:00.000Z",
          "AdjustmentAmount": { "CurrencyCode": "USD", "CurrencyAmount": -22.00 },
          "AdjustmentItemList": [
            {
              "SellerSKU": "GADGET-BASIC-002",
              "Quantity": 1,
              "TotalAmount": { "CurrencyCode": "USD", "CurrencyAmount": -22.00 }
            }
          ]
        }
      ],
      "ServiceFeeEventList": [
        {
          "FeeDescription": "Subscription fee",
          "FeeReason": "Monthly Professional Selling Plan fee",
          "PostedDate": "2026-06-12T08:00:00.000Z",
          "FeeList": [
            { "FeeType": "SubscriptionFee", "FeeAmount": { "CurrencyCode": "USD", "CurrencyAmount": -39.99 } }
          ]
        }
      ]
    },
    "NextToken": "eyJvIjo1LCJtIjo1fQ"
  }
}
```

> **Note on amounts:** The Finances mock uses `CurrencyAmount: number` (per Amazon's Finances API). The Orders mock uses `Amount: string` (per Amazon's Orders API). These differ intentionally to match the real SP-API contracts.

---

## Utility

### 6. Health Check

**`GET /health`**

No authentication required.

#### Request

```bash
curl -s http://localhost:3000/health | jq .
```

#### Response — 200 OK

```json
{
  "status": "ok",
  "uptime": 142.35
}
```

---

## Error Reference

All business endpoint errors follow this envelope (mirroring real SP-API):

```json
{
  "errors": [
    {
      "code": "ErrorCode",
      "message": "Human-readable description.",
      "details": "Optional additional context."
    }
  ]
}
```

| HTTP Status | `code` | When |
|---|---|---|
| `400` | `InvalidInput` | Missing required param, invalid date format, `CreatedBefore` ≤ `CreatedAfter`, mismatched `MaxResultsPerPage` on `NextToken` reuse |
| `403` | `Unauthorized` | Missing or expired `x-amz-access-token` header |
| `404` | `NotFound` | `orderId` not found in seed data |
| `429` | `TooManyRequests` | Exceeded `ORDERS_RATE_LIMIT_THRESHOLD` in `ORDERS_RATE_LIMIT_WINDOW_MS` ms |

Auth errors (`POST /auth/o2/token`) use a different OAuth-style envelope:

```json
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```

| HTTP Status | `error` | When |
|---|---|---|
| `400` | `invalid_request` | Missing/malformed body fields |
| `400` | `invalid_grant` | `refresh_token` value does not match `MOCK_REFRESH_TOKEN` |
| `401` | `invalid_client` | `client_id` / `client_secret` mismatch |

---

## Seed Data Catalog

### Orders — 13 seed orders

| `AmazonOrderId` | Status | `ItemPrice` (Orders) | Notes |
|---|---|---|---|
| `111-2345678-9012345` | Shipped | $89.99 | Clean match with Finances |
| `222-3456789-0123456` | Shipped | $49.98 | Clean match; also has suspicious `MiscAdjustment` in Finances |
| `333-4567890-1234567` | Shipped | $149.99 | Clean shipment; asymmetric refund in Finances (FBA fee not reimbursed) |
| `444-5678901-2345678` | Shipped | $119.97 | **Mismatch** — Finances settled only $29.97 (shortpay $90.00) |
| `555-6789012-3456789` | Shipped | $199.99 + $15.00 | Multi-item order (2 SKUs) |
| `666-7890123-4567890` | Shipped | $24.99 | Clean match |
| `777-8901234-5678901` | Shipped | $99.99 | **Mismatch** — Finances settled only $79.99 (shortpay $20.00) |
| `888-9012345-6789012` | Shipped | $39.98 | Clean match |
| `999-0123456-7890123` | Shipped | $299.99 | Clean match |
| `200-1111111-1111111` | Shipped | $59.99 | **No Finances record** — unsettled payout |
| `201-2222222-2222222` | Shipped | $34.50 | **No Finances record** — unsettled payout |
| `300-3333333-3333333` | Canceled | $45.00 | Excluded from reconciliation |
| `301-4444444-4444444` | Pending | $75.00 | Excluded from reconciliation; order items omit pricing fields |

> **Reconciliation note:** `Canceled` and `Pending` orders carry an `OrderTotal` for response-shape consistency, but the reconciliation engine should exclude them **by `OrderStatus`** — not by the presence or absence of pricing fields. Only `Shipped` orders represent revenue that is expected to settle.

### Financial Events — 32 seed events

| Type | Count | Notable events |
|---|---|---|
| `ShipmentEventList` | 9 | Orders 111–999; order 444 settled at $29.97 vs expected $119.97 (shortpay); order 777 at $79.99 vs $99.99 |
| `RefundEventList` | 4 | Orders 111, 222, 333 (suspicious: FBA fee not reimbursed on refund), 555 |
| `AdjustmentEventList` | 7 | Includes suspicious `MiscAdjustment` −$22.00 on `GADGET-BASIC-002` (order 222) with no matching rationale |
| `ServiceFeeEventList` | 5 | Monthly subscription fee, storage, sponsored ads, long-term storage, per-unit storage |
| `ChargebackEventList` | 4 | Orders 111, 333, 666, 888 |
| `GuaranteeClaimEventList` | 3 | Orders 444, 777, 999 |

### Marketplace

All orders use marketplace `ATVPDKIKX0DER` (Amazon.com US) — a public, documented constant, not PII.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | Runtime environment |
| `CLIENT_ID` | `amzn1.application-oa2-client.mockspapi` | LWA client ID |
| `CLIENT_SECRET` | `mock_client_secret` | LWA client secret |
| `MOCK_REFRESH_TOKEN` | `Atzr\|mock_refresh_token` | Static refresh token |
| `ACCESS_TOKEN_TTL_SECONDS` | `3600` | Access token lifetime in seconds |
| `ORDERS_RATE_LIMIT_THRESHOLD` | `5` | Max Orders API requests per window before 429 |
| `ORDERS_RATE_LIMIT_WINDOW_MS` | `10000` | Sliding window size in ms for rate limiting |
