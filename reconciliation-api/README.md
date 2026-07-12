# Reconciliation API

HTTP API that wraps the [`reconciliation-engine`](../reconciliation-engine) and exposes it for a browser SPA. It fetches from the mock `sp-api-service`, normalizes, reconciles, and serves the results — plus on-demand Gemini explanations.

## Architecture

```text
React SPA (future)
      | HTTP + CORS
reconciliation-api (Hono :4000)
      | imports
reconciliation-engine  --SpApiClient-->  sp-api-service (:3000)
                       --GeminiClient--> Gemini 3.1 Flash-Lite
```

The engine stays a pure library; this package only orchestrates and transports. A short-TTL in-memory cache of the fetched + normalized + reconciled dataset means the endpoints don't each re-hit the rate-limited mock, and gives `explain` a record source.

## Endpoints

| Method | Path | Response |
|---|---|---|
| GET | `/health` | `{ status, uptime }` |
| GET | `/api/orders` | `{ orders, warnings }` |
| GET | `/api/finances` | `{ financeLines }` |
| GET | `/api/reconcile` | `ReconciliationRecord[]` (append `?refresh=true` to bypass cache) |
| POST | `/api/explain/:orderId` | `SellerExplanation` — `404` unknown order, `502` LLM failure, `503` no key |

Reconcile and explain are intentionally **separate**: the table renders instantly from `/api/reconcile`, and the (slow, paid) LLM call happens only when a seller asks for an explanation.

## Quick start

```bash
# Terminal 1 — mock Amazon API
cd sp-api-service && pnpm dev            # :3000

# Terminal 2 — this API
cp .env.example .env                     # set matching SP-API creds + GEMINI_API_KEY
pnpm dev                                 # :4000 (builds the engine first)

curl localhost:4000/api/reconcile
curl -X POST localhost:4000/api/explain/444-5678901-2345678
```

> The `predev`/`prebuild` scripts build `reconciliation-engine` first, since this package imports its compiled output.

## Configuration (`.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed origins, or `*` |
| `SP_API_BASE_URL` | `http://localhost:3000` | Mock SP-API URL |
| `SP_API_CLIENT_ID` / `SP_API_CLIENT_SECRET` | mock creds | LWA credentials (`CLIENT_ID`/`CLIENT_SECRET` also accepted). Must match `sp-api-service` |
| `COMMISSION_RATE` | `0.15` | Flat referral-fee assumption |
| `SHORTPAY_TOLERANCE` | `0.50` | Min principal gap to flag shortpay |
| `CREATED_AFTER` | `2020-01-01T00:00:00Z` | Order fetch start date |
| `DATA_CACHE_TTL_MS` | `30000` | Cache lifetime for the fetched dataset |
| `GEMINI_API_KEY` | *(none)* | Google Gemini key; only needed for `/api/explain`. Kept separate from SP-API creds |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | Gemini model for explanations |

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Run with watch (builds engine first) |
| `pnpm build` | Compile TypeScript (builds engine first) |
| `pnpm start` | Run compiled server |
| `pnpm test` | Vitest unit tests (no network) |
| `pnpm lint` | ESLint |

See [API.md](./API.md) for the full endpoint reference (curl examples, schemas, errors) and [../docs/RECONCILIATION-FLOW.md](../docs/RECONCILIATION-FLOW.md) for the full system flow.
