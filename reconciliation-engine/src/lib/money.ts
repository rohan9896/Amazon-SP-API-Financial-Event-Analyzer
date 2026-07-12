export function parseMoneyAmount(amount: string | number | undefined | null): number {
  if (amount === undefined || amount === null || amount === '') {
    return 0;
  }
  const parsed = typeof amount === 'number' ? amount : Number.parseFloat(amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return `$${Math.abs(roundCurrency(amount)).toFixed(2)}`;
}
