import type { ReconciliationFinanceLine } from '../domain/types.js';

export function dedupeFinanceLines(
  lines: ReconciliationFinanceLine[],
): ReconciliationFinanceLine[] {
  const seen = new Set<string>();
  const result: ReconciliationFinanceLine[] = [];

  for (const line of lines) {
    if (seen.has(line.eventId)) {
      continue;
    }
    seen.add(line.eventId);
    result.push(line);
  }

  return result;
}

export function joinFinanceLinesToOrder(
  orderId: string,
  itemSkus: string[],
  allLines: ReconciliationFinanceLine[],
): ReconciliationFinanceLine[] {
  const skuSet = new Set(itemSkus);

  return allLines.filter((line) => {
    if (line.orderId === orderId) {
      return true;
    }

    if (!line.orderId && line.sellerSKU && skuSet.has(line.sellerSKU)) {
      return true;
    }

    return false;
  });
}
