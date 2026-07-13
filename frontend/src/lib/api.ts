export type ReconciliationOrderItem = {
  sellerSKU: string
  quantityOrdered: number
  itemPrice: number
  itemTax: number
  shippingPrice: number
}

export type ReconciliationOrder = {
  orderId: string
  orderStatus: string
  marketplaceId: string
  items: ReconciliationOrderItem[]
}

export type ReconciliationFinanceLine = {
  eventId: string
  orderId?: string
  sellerSKU?: string
  eventCategory: string
  lineType: string
  amount: number
  currency: string
  postedDate: string
}

export type ReconciliationFlag = 'shortpay' | 'no_settlement' | 'unexplained_fee' | 'missing_reimbursement'

export type ReconciliationRecord = {
  orderId: string
  expectedRevenue: number
  actualSettled: number
  discrepancy: number
  flags: ReconciliationFlag[]
  flagMessages: string[]
  financeLines: ReconciliationFinanceLine[]
  warnings: string[]
}

export type SellerExplanation = {
  orderId: string
  headline: string
  summary: string
  reason: string
  evidence: string[]
  recommendedAction: string
  confidence: 'high' | 'medium' | 'low'
  calculation: CalculationBreakdown
}

export type CalculationLine = {
  label: string
  eventCategory: string
  lineType: string
  amount: number
}

export type CalculationBreakdown = {
  formulas: {
    expectedRevenue: string
    actualSettled: string
    discrepancy: string
    principalGap: string
  }
  expected: {
    commissionRate: number
    itemSubtotal: number
    shippingTotal: number
    taxTotal: number
    commissionFee: number
    expectedRevenue: number
    steps: string[]
  }
  actual: {
    lines: CalculationLine[]
    credits: number
    debits: number
    actualSettled: number
    steps: string[]
  }
  discrepancy: {
    value: number
    meaning: 'underpaid' | 'overpaid' | 'matched'
    steps: string[]
  }
  principal: {
    expectedPrincipal: number
    actualPrincipal: number
    principalGap: number
    shortpayTolerance: number
    shortpayTriggered: boolean
    steps: string[]
  }
}

export type OrdersResponse = {
  orders: ReconciliationOrder[]
  warnings: Record<string, string[]>
}

export type FinancesResponse = {
  financeLines: ReconciliationFinanceLine[]
}

export class ApiError extends Error {
  readonly status: number
  readonly detail?: string

  constructor(message: string, status: number, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

// In dev this stays empty so Vite's proxy handles /api and /health.
// In production set VITE_API_BASE_URL to the deployed reconciliation-api origin.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    let detail: string | undefined
    try {
      const body = (await response.json()) as { error?: string; detail?: string }
      message = body.error ?? message
      detail = body.detail
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status, detail)
  }

  return (await response.json()) as T
}

export function fetchOrders(): Promise<OrdersResponse> {
  return request<OrdersResponse>('/api/orders')
}

export function fetchFinances(): Promise<FinancesResponse> {
  return request<FinancesResponse>('/api/finances')
}

export function fetchReconcile(refresh = false): Promise<ReconciliationRecord[]> {
  const query = refresh ? '?refresh=true' : ''
  return request<ReconciliationRecord[]>(`/api/reconcile${query}`)
}

export function explainOrder(orderId: string): Promise<SellerExplanation> {
  return request<SellerExplanation>(`/api/explain/${encodeURIComponent(orderId)}`, {
    method: 'POST',
  })
}
