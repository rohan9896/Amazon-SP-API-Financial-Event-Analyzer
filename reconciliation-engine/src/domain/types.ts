export type ReconciliationFlag = 'shortpay' | 'no_settlement' | 'unexplained_fee' | 'missing_reimbursement';

export type ReconciliationOrderItem = {
  sellerSKU: string;
  quantityOrdered: number;
  itemPrice: number;
  itemTax: number;
  shippingPrice: number;
};

export type ReconciliationOrder = {
  orderId: string;
  orderStatus: string;
  marketplaceId: string;
  items: ReconciliationOrderItem[];
};

export type ReconciliationFinanceLine = {
  eventId: string;
  orderId?: string;
  sellerSKU?: string;
  eventCategory: string;
  lineType: string;
  amount: number;
  currency: string;
  postedDate: string;
};

export type ReconciliationRecord = {
  orderId: string;
  expectedRevenue: number;
  actualSettled: number;
  discrepancy: number;
  flags: ReconciliationFlag[];
  flagMessages: string[];
  financeLines: ReconciliationFinanceLine[];
  warnings: string[];
};

export type ReconciliationConfig = {
  commissionRate: number;
  shortpayTolerance: number;
};

export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  commissionRate: 0.15,
  shortpayTolerance: 0.5,
};

export const RECONCILABLE_STATUSES = new Set(['Shipped']);
