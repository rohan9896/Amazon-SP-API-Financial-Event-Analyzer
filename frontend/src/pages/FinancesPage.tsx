import { useEffect, useState } from 'react'

import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageStates'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, fetchFinances, type ReconciliationFinanceLine } from '@/lib/api'
import { cn, formatUsd } from '@/lib/utils'

export function FinancesPage() {
  const [lines, setLines] = useState<ReconciliationFinanceLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchFinances()
      .then((data) => {
        if (!cancelled) {
          setLines(data.financeLines)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load finance lines')
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
        title="Finances"
        description="Flattened financial event lines from the mock Finances API."
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && lines && lines.length === 0 ? (
        <EmptyState message="No finance lines found." />
      ) : null}
      {!loading && !error && lines && lines.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Posted</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.eventId}>
                <TableCell className="whitespace-nowrap font-mono text-xs">
                  {new Date(line.postedDate).toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-xs">{line.orderId ?? '—'}</TableCell>
                <TableCell className="text-xs">{line.eventCategory.replace(/EventList$/, '')}</TableCell>
                <TableCell>{line.lineType}</TableCell>
                <TableCell className="font-mono text-xs">{line.sellerSKU ?? '—'}</TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums',
                    line.amount < 0 ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  {formatUsd(line.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  )
}
