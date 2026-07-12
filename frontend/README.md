# Frontend — Seller Dashboard

Minimal React SPA for browsing orders, finance lines, and reconciliation results from [`reconciliation-api`](../reconciliation-api).

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- shadcn-style UI (Button, Table, Badge, Dialog)
- React Router (sidebar navigation)

## Pages

| Route | What it shows |
|---|---|
| `/orders` | Normalized shipped orders |
| `/finances` | Flat finance event lines |
| `/reconciliation` | Run reconcile → table + **Explain** dialog (Gemini) |

## Quick start

```bash
# Terminal 1 — mock Amazon API
cd sp-api-service && pnpm dev

# Terminal 2 — product API
cd reconciliation-api && pnpm dev

# Terminal 3 — this SPA
cd frontend && pnpm dev
# http://localhost:5173
```

Vite proxies `/api` and `/health` to `http://localhost:4000`, so the browser never talks to `sp-api-service` directly.

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Vite dev server (:5173) |
| `pnpm build` | Typecheck + production build |
| `pnpm preview` | Preview production build |

## Notes

- **Explain** needs `GEMINI_API_KEY` on `reconciliation-api`. Without it the dialog shows a `503` message.
- Reconciliation runs only when you click **Run reconciliation** (optional **Refresh** after).
- See [../reconciliation-api/API.md](../reconciliation-api/API.md) for endpoint contracts.
