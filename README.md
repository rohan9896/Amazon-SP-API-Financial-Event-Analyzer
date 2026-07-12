# Amazon SP-API Financial Event Analyzer

A working reconciliation system for Amazon seller payouts, built on a **mock Amazon SP-API** instead of the real one (production SP-API access requires business registration, approval, and seller authorization). It compares what an order *should* have paid out against what actually settled, flags the gaps, and uses an LLM to explain flagged orders in plain English — end to end, from a fake Amazon backend to a browser dashboard.

The project is a **pnpm monorepo** of four independent packages:

| Package | Role | Port |
|---|---|---|
| [`sp-api-service`](sp-api-service) | Mock Amazon SP-API (LWA auth, Orders API, Finances API) | `3000` |
| [`reconciliation-engine`](reconciliation-engine) | Pure reconciliation logic + Gemini seller-explanation layer | — (library + CLI) |
| [`reconciliation-api`](reconciliation-api) | Hono HTTP API that wraps the engine for a browser SPA | `4000` |
| [`frontend`](frontend) | React SPA dashboard (Orders / Finances / Reconciliation) | `5173` |

For a full plain-English walkthrough of every term and design decision, see [`docs/RECONCILIATION-FLOW.md`](docs/RECONCILIATION-FLOW.md).

---

## The problem it solves

Amazon pays sellers *after* deducting referral fees, FBA fees, refunds, chargebacks, and reimbursements. What actually lands in a seller's account (**actual settled**) is rarely what they'd naively expect from the order (**expected revenue**). This project:

1. Simulates Amazon's Orders + Finances APIs realistically enough (auth, pagination, rate limiting, error shapes) to build against without real Amazon credentials.
2. Joins orders to their financial events and computes `expectedRevenue`, `actualSettled`, and `discrepancy` per order.
3. Flags orders as `shortpay` (underpaid on principal) or `no_settlement` (no financial events at all).
4. Lets a seller click "Explain" on a flagged order to get a plain-English, evidence-backed narration from Google Gemini — the LLM only narrates numbers the engine already computed; it never does its own math.

---

## Architecture

```text
React SPA (frontend, :5173)
        │  HTTP + CORS
        ▼
reconciliation-api (Hono, :4000)
        │  imports as a library
        ▼
reconciliation-engine
        │  SpApiClient (auth, pagination, 429 retry)
        ▼
sp-api-service (Hono, :3000)  ── mock Amazon SP-API

reconciliation-engine  ──GeminiClient──▶  Google Gemini 3.1 Flash-Lite (explanations only)
```

- `sp-api-service` knows nothing about reconciliation — it just mimics Amazon.
- `reconciliation-engine`'s core `reconcile()` function is a **pure, network-free function** (orders + finance lines in, records out), independently unit-tested.
- `reconciliation-api` adds no business logic — it only fetches, caches, and transports the engine's output over HTTP for the browser.
- `frontend` never talks to `sp-api-service` or Gemini directly; it only calls `reconciliation-api`.

---

## Quick start

Requires Node 20+ and `pnpm`.

```bash
# install all workspace packages
pnpm install

# Terminal 1 — mock Amazon SP-API
cd sp-api-service
cp .env.example .env
pnpm dev                      # http://localhost:3000

# Terminal 2 — reconciliation API (builds the engine first)
cd reconciliation-api
cp .env.example .env          # SP_API_CLIENT_ID/SECRET must match sp-api-service/.env
                               # add GEMINI_API_KEY to enable "Explain"
pnpm dev                      # http://localhost:4000

# Terminal 3 — frontend dashboard
cd frontend
pnpm dev                      # http://localhost:5173
```

Open `http://localhost:5173` and browse **Orders → Finances → Reconciliation**. Click **Run reconciliation**, then **Explain** on any flagged row.

You can also drive things headlessly:

```bash
cd reconciliation-engine
pnpm reconcile -- --output report.json   # fetch + reconcile, no server needed
pnpm explain -- --order 444-5678901-2345678   # Gemini explanation for one order
```

---

## What each package actually does

### `sp-api-service` — Mock Amazon SP-API

A Hono service that mirrors real SP-API response shapes closely enough to build against (nested `payload`, `NextToken` pagination, `x-amz-access-token` header, error envelopes) without needing real Amazon credentials.

- `POST /auth/o2/token` — LWA-style `client_credentials` / `refresh_token` grants, in-memory tokens with configurable TTL
- `GET /orders/v0/orders` — paginated, filterable by date range / status / marketplace
- `GET /orders/v0/orders/:orderId/orderItems` — line items (pricing intentionally omitted for `Pending` orders, matching real Amazon behavior)
- `GET /finances/v0/financialEvents` — shipments, refunds, adjustments, service fees, chargebacks, guarantee claims
- Simulated rate limiting (`429` + `Retry-After`) on the Orders endpoints
- 13 seeded orders and 32 seeded financial events, deliberately including clean matches, shortpays, and orders with zero settlement — see [`sp-api-service/API.md`](sp-api-service/API.md) for the full seed catalog and endpoint reference

### `reconciliation-engine` — the reconciliation logic

- Normalizes raw SP-API shapes into flat, engine-native `Order` and `FinanceLine` types
- `reconcile(orders, financeLines, config)` — a pure function (no network, no I/O) that computes `expectedRevenue`, `actualSettled`, `discrepancy`, and flags (`shortpay`, `no_settlement`) per order
- Ships a CLI (`pnpm reconcile`) that fetches from the mock service, normalizes, reconciles, and prints/writes a JSON report
- Ships a Gemini-powered `explain` layer (`pnpm explain`) that turns a reconciliation record into a seller-facing explanation — narration only, no re-calculation, and no templated fallback if the LLM call fails
- Documented assumptions: flat 15% commission, `$0.50` shortpay tolerance, USD only, `Shipped`-only orders — see [`reconciliation-engine/README.md`](reconciliation-engine/README.md)

### `reconciliation-api` — the HTTP layer for the SPA

- Wraps the engine and exposes it over CORS-enabled REST endpoints for the browser
- Fetches + normalizes + reconciles once, then serves a short-TTL in-memory cache so `/api/orders`, `/api/finances`, and `/api/reconcile` all see a consistent snapshot
- Keeps Amazon LWA credentials and the Gemini API key entirely server-side — the browser never sees them

| Method | Path | Returns |
|---|---|---|
| GET | `/health` | service status |
| GET | `/api/orders` | normalized shipped orders |
| GET | `/api/finances` | flattened finance lines |
| GET | `/api/reconcile` | reconciliation records (`?refresh=true` to bypass cache) |
| POST | `/api/explain/:orderId` | on-demand Gemini seller explanation |

Full request/response schemas and error reference: [`reconciliation-api/API.md`](reconciliation-api/API.md).

### `frontend` — the seller dashboard

A minimal React 19 + TypeScript + Vite SPA (Tailwind v4, shadcn-style components, React Router) with three pages:

| Route | Shows |
|---|---|
| `/orders` | Normalized shipped orders |
| `/finances` | Flat finance event lines |
| `/reconciliation` | Reconcile table + **Explain** dialog (Gemini) |

Vite proxies `/api` and `/health` to `reconciliation-api` in dev, so the browser only ever talks to that one API.

---

## Repository layout

```text
sp-api-service/         mock Amazon SP-API (auth, orders, finances)
reconciliation-engine/  pure reconciliation core + Gemini explain CLI
reconciliation-api/     Hono API wrapping the engine for the SPA
frontend/               React dashboard
docs/
  RECONCILIATION-FLOW.md  full system walkthrough, glossary, mermaid diagrams
stories/                 implementation stories (0001–0007), one per feature slice
```

---

## Tech stack

- **Backend:** TypeScript, Node.js, [Hono](https://hono.dev), Zod validation
- **Reconciliation core:** plain TypeScript, no framework — deliberately network-free and unit-testable
- **LLM explanations:** Google Gemini (`gemini-3.1-flash-lite`)
- **Frontend:** React 19, Vite, Tailwind CSS v4, React Router, Radix UI primitives
- **Tooling:** pnpm workspaces, Vitest, ESLint / oxlint, Docker (for `sp-api-service`)

---

## Testing

```bash
cd reconciliation-engine && pnpm test   # unit tests for reconcile() and normalization — no network
cd reconciliation-api && pnpm test      # API-layer tests
```

`reconciliation-engine/scripts/verify-e2e.ts` runs an end-to-end check against a live `sp-api-service` instance.

---

## What's out of scope

This is a demo/portfolio system, not a production integration:

- No real Amazon SP-API / LWA authorization — the mock is a stand-in until business registration is available
- No Restricted Data Token (RDT) or buyer PII simulation
- No multi-marketplace or multi-currency support
- No persistent database — data is re-fetched from the mock service and cached in memory
- Commission is a flat 15% assumption, not Amazon's real per-category referral fee schedule

See [`docs/RECONCILIATION-FLOW.md`](docs/RECONCILIATION-FLOW.md) for the complete list of assumptions and phase-2 ideas (`unexplained_fee`, `missing_reimbursement`, split shipments, scheduled sync, etc.).

---

## License

See [`LICENSE`](LICENSE).
