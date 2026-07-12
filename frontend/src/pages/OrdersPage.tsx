import { useEffect, useState } from 'react'

import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageStates'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, fetchOrders, type ReconciliationOrder } from '@/lib/api'
import { formatUsd } from '@/lib/utils'

export function OrdersPage() {
  const [orders, setOrders] = useState<ReconciliationOrder[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchOrders()
      .then((data) => {
        if (!cancelled) {
          setOrders(data.orders)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load orders')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Shipped orders from the mock SP-API, normalized for reconciliation."
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && orders && orders.length === 0 ? (
        <EmptyState message="No shipped orders found." />
      ) : null}
      {!loading && !error && orders && orders.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead>SKUs</TableHead>
              <TableHead className="text-right">Item total</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Shipping</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const itemTotal = order.items.reduce((sum, item) => sum + item.itemPrice, 0)
              const taxTotal = order.items.reduce((sum, item) => sum + item.itemTax, 0)
              const shippingTotal = order.items.reduce((sum, item) => sum + item.shippingPrice, 0)
              return (
                <TableRow key={order.orderId}>
                  <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                  <TableCell>{order.orderStatus}</TableCell>
                  <TableCell className="font-mono text-xs">{order.marketplaceId}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs">
                    {order.items.map((item) => item.sellerSKU).join(', ') || '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(itemTotal)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(taxTotal)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(shippingTotal)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : null}
    </div>
  )
}
