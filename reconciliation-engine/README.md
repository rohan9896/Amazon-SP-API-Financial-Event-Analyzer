# Reconciliation Engine

Pure reconciliation core that compares expected order revenue against actual settled amounts from financial events. Consumes the mock `sp-api-service` via a thin HTTP client, or runs standalone against normalized inputs.

## Architecture

```text
sp-api-service (HTTP)
        ↓
  SpApiClient (auth, pagination, 429 retry)
        ↓
  normalize/ (SP-API → engine types)
        ↓
  reconcile() (pure function — no network)
        ↓
  ReconciliationReport[]
```

The core `reconcile(orders, financeLines, config)` function has **no API dependency** and is independently unit-testable.

## Quick start

```bash
# Terminal 1 — start mock SP-API
cd sp-api-service
pnpm dev

# Terminal 2 — run reconciliation
cd reconciliation-engine
cp .env.example .env
pnpm reconcile
```

Write output to a file:

```bash
pnpm reconcile -- --output report.json
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `SP_API_BASE_URL` | `http://localhost:3000` | Mock service URL |
| `SP_API_CLIENT_ID` | mock client ID | LWA credentials |
| `SP_API_CLIENT_SECRET` | mock secret | LWA credentials |
| `COMMISSION_RATE` | `0.15` | Flat referral fee assumption |
| `SHORTPAY_TOLERANCE` | `0.50` | Min principal gap to flag shortpay |
| `CREATED_AFTER` | `2020-01-01T00:00:00Z` | Order fetch date range |
| `GEMINI_API_KEY` | *(none)* | Google Gemini key for `pnpm explain`. Kept separate from SP-API creds |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | Gemini model used for seller explanations |

## Core API

```typescript
import { reconcile, normalizeOrders, normalizeFinancialEvents } from 'reconciliation-engine';

const { orders } = normalizeOrders(rawOrdersWithItems);
const financeLines = normalizeFinancialEvents(rawFinancialEvents);

const report = reconcile(orders, financeLines, {
  commissionRate: 0.15,
  shortpayTolerance: 0.50,
});
```

## Output schema

```json
{
  "orderId": "444-5678901-2345678",
  "expectedRevenue": 101.97,
  "actualSettled": -9.00,
  "discrepancy": -110.97,
  "flags": ["shortpay"],
  "flagMessages": ["Underpaid by $90.00"],
  "financeLines": [],
  "warnings": []
}
```

## Assumptions and simplifications

- **Flat 15% commission** — not category-specific referral rates (real SP-API has per-category fees).
- **Principal-level shortpay** — full `expectedRevenue` / `actualSettled` are always computed, but shortpay detection compares Principal only to avoid FBA-fee false positives on clean orders.
- **`ItemPrice` is line total** — per Amazon Orders API semantics (already qty-extended); not multiplied by `quantityOrdered` again.
- **Pending/Canceled excluded** — only `Shipped` orders are reconciled, by `OrderStatus`.
- **SKU-based join** — adjustments without `orderId` are matched to orders via `sellerSKU`.
- **Account-level fees excluded** — subscription/reserve events with no orderId or SKU are not attributed to any order.
- **Split shipments** — deferred to phase 2.
- **USD only** — no multi-currency conversion.

## Phase 1 rules

| Flag | Rule | Condition |
|---|---|---|
| `no_settlement` | RL-8 | Zero finance lines joined to order |
| `shortpay` | RL-7 | Principal gap below tolerance |

Phase 2 stubs (exported, not wired): `unexplained_fee`, `missing_reimbursement`.

## Tests

```bash
pnpm test        # unit tests (no network)
pnpm test:watch
```

## Scripts

| Script | Description |
|---|---|
| `pnpm build` | Compile TypeScript |
| `pnpm test` | Run Vitest unit tests |
| `pnpm reconcile` | Fetch from mock API and print report |
| `pnpm explain` | Narrate flagged orders from a report via Gemini (needs `GEMINI_API_KEY`) |
| `pnpm lint` | ESLint |

## Seller explanations (LLM layer)

`pnpm explain` turns reconciliation records into plain-English, seller-facing explanations using Google **Gemini 3.1 Flash-Lite**. The LLM only narrates numbers `reconcile()` already produced — it never does its own math. There is **no fallback**: a missing key or any API/parse failure surfaces an error and exits non-zero.

```bash
pnpm reconcile -- --output report.json         # produce a report first
pnpm explain                                   # explain flagged orders
pnpm explain -- --order 444-5678901-2345678    # explain one order
pnpm explain -- --all --output explanations.json
```

See [../docs/RECONCILIATION-FLOW.md](../docs/RECONCILIATION-FLOW.md) section 9 for the full flow.
