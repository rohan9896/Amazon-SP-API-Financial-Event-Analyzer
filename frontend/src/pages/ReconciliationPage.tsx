import { useState } from 'react'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'

import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/PageStates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ApiError,
  explainOrder,
  fetchReconcile,
  type ReconciliationRecord,
  type SellerExplanation,
} from '@/lib/api'
import { cn, formatUsd } from '@/lib/utils'

function flagVariant(flag: string): 'danger' | 'warning' | 'secondary' {
  if (flag === 'shortpay') return 'danger'
  if (flag === 'no_settlement') return 'warning'
  return 'secondary'
}

export function ReconciliationPage() {
  const [records, setRecords] = useState<ReconciliationRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [explainOpen, setExplainOpen] = useState(false)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainError, setExplainError] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<SellerExplanation | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)

  async function runReconcile(refresh = false) {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReconcile(refresh)
      setRecords(data)
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Failed to reconcile')
      setRecords(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleExplain(orderId: string) {
    setActiveOrderId(orderId)
    setExplainOpen(true)
    setExplainLoading(true)
    setExplainError(null)
    setExplanation(null)
    try {
      const result = await explainOrder(orderId)
      setExplanation(result)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const suffix = err.detail ? ` — ${err.detail}` : ''
        setExplainError(`${err.message}${suffix}`)
      } else {
        setExplainError('Failed to generate explanation')
      }
    } finally {
      setExplainLoading(false)
    }
  }

  const flaggedCount = records?.filter((r) => r.flags.length > 0).length ?? 0

  return (
    <div>
      <PageHeader
        title="Reconciliation"
        description="Compare expected revenue against settled amounts. Explain pulls a Gemini summary for one order."
        actions={
          <>
            {records ? (
              <Button variant="outline" size="sm" onClick={() => void runReconcile(true)} disabled={loading}>
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                Refresh
              </Button>
            ) : null}
            <Button onClick={() => void runReconcile(false)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Run reconciliation
            </Button>
          </>
        }
      />

      {loading && !records ? <LoadingState label="Reconciling…" /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && records === null ? (
        <EmptyState message='Click "Run reconciliation" to fetch and compare orders against finance events.' />
      ) : null}

      {records && records.length > 0 ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {records.length} orders · {flaggedCount} flagged
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Settled</TableHead>
                <TableHead className="text-right">Discrepancy</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.orderId}>
                  <TableCell className="font-mono text-xs">{record.orderId}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsd(record.expectedRevenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsd(record.actualSettled)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums font-medium',
                      record.discrepancy < 0 ? 'text-destructive' : 'text-foreground',
                    )}
                  >
                    {formatUsd(record.discrepancy)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {record.flags.length === 0 ? (
                        <Badge variant="secondary">clean</Badge>
                      ) : (
                        record.flags.map((flag) => (
                          <Badge key={flag} variant={flagVariant(flag)}>
                            {flag}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleExplain(record.orderId)}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Explain
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}

      <Dialog open={explainOpen} onOpenChange={setExplainOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seller explanation</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {activeOrderId}
            </DialogDescription>
          </DialogHeader>

          {explainLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating explanation…
            </div>
          ) : null}

          {explainError ? <ErrorState message={explainError} /> : null}

          {explanation ? (
            <div className="space-y-5 text-sm">
              <div>
                <p className="font-semibold text-foreground">{explanation.headline}</p>
                <p className="mt-1 text-muted-foreground">{explanation.summary}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Reason
                </p>
                <p className="mt-1">{explanation.reason}</p>
              </div>
              {explanation.evidence.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Evidence
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {explanation.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommended action
                </p>
                <p className="mt-1">{explanation.recommendedAction}</p>
              </div>
              <Badge variant="outline">Confidence: {explanation.confidence}</Badge>

              <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Formulas used
                  </p>
                  <ul className="mt-2 space-y-1 font-mono text-xs">
                    <li>
                      <span className="text-muted-foreground">expectedRevenue = </span>
                      {explanation.calculation.formulas.expectedRevenue}
                    </li>
                    <li>
                      <span className="text-muted-foreground">actualSettled = </span>
                      {explanation.calculation.formulas.actualSettled}
                    </li>
                    <li>
                      <span className="text-muted-foreground">discrepancy = </span>
                      {explanation.calculation.formulas.discrepancy}
                    </li>
                    <li>
                      <span className="text-muted-foreground">principalGap = </span>
                      {explanation.calculation.formulas.principalGap}
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Expected revenue breakdown
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {explanation.calculation.expected.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actual settlement breakdown
                  </p>
                  {explanation.calculation.actual.lines.length > 0 ? (
                    <div className="mt-2 overflow-auto rounded-md border border-border bg-card">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60 text-left text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1.5 font-medium">Line</th>
                            <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {explanation.calculation.actual.lines.map((line) => (
                            <tr key={`${line.label}-${line.amount}`} className="border-t border-border">
                              <td className="px-2 py-1.5">{line.label}</td>
                              <td
                                className={cn(
                                  'px-2 py-1.5 text-right tabular-nums',
                                  line.amount < 0 ? 'text-destructive' : '',
                                )}
                              >
                                {formatUsd(line.amount)}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-border font-medium">
                            <td className="px-2 py-1.5">Net actualSettled</td>
                            <td
                              className={cn(
                                'px-2 py-1.5 text-right tabular-nums',
                                explanation.calculation.actual.actualSettled < 0
                                  ? 'text-destructive'
                                  : '',
                              )}
                            >
                              {formatUsd(explanation.calculation.actual.actualSettled)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {explanation.calculation.actual.steps
                      .filter((step) => !step.includes('·'))
                      .map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Discrepancy
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {explanation.calculation.discrepancy.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Principal / shortpay check
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {explanation.calculation.principal.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
