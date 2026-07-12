import type { ReconciliationFinanceLine } from '../domain/types.js';

type CurrencyAmount = {
  CurrencyCode: string;
  CurrencyAmount: number;
};

type ChargeComponent = {
  ChargeType: string;
  ChargeAmount: CurrencyAmount;
};

type FeeComponent = {
  FeeType: string;
  FeeAmount: CurrencyAmount;
};

type ShipmentItem = {
  SellerSKU?: string;
  OrderItemId?: string;
  QuantityShipped?: number;
  ItemChargeList?: ChargeComponent[];
  ItemFeeList?: FeeComponent[];
  ItemChargeAdjustmentList?: ChargeComponent[];
  ItemFeeAdjustmentList?: FeeComponent[];
};

type ShipmentEvent = {
  AmazonOrderId: string;
  PostedDate: string;
  ShipmentItemList?: ShipmentItem[];
};

type RefundEvent = {
  AmazonOrderId: string;
  PostedDate: string;
  ShipmentItemAdjustmentList?: ShipmentItem[];
};

type AdjustmentEvent = {
  AdjustmentType: string;
  PostedDate: string;
  AdjustmentAmount: CurrencyAmount;
  AdjustmentItemList?: {
    SellerSKU?: string;
    TotalAmount?: CurrencyAmount;
  }[];
};

type ServiceFeeEvent = {
  AmazonOrderId?: string;
  PostedDate: string;
  FeeList: FeeComponent[];
};

type ChargebackEvent = {
  AmazonOrderId: string;
  PostedDate: string;
  ChargebackAmount: CurrencyAmount;
};

type GuaranteeClaimEvent = {
  AmazonOrderId: string;
  PostedDate: string;
  ClaimAmount: CurrencyAmount;
};

export type SpApiFinancialEvents = {
  ShipmentEventList?: ShipmentEvent[];
  RefundEventList?: RefundEvent[];
  AdjustmentEventList?: AdjustmentEvent[];
  ServiceFeeEventList?: ServiceFeeEvent[];
  ChargebackEventList?: ChargebackEvent[];
  GuaranteeClaimEventList?: GuaranteeClaimEvent[];
};

function makeEventId(
  category: string,
  postedDate: string,
  key: string,
  lineType: string,
  index: number,
): string {
  return `${category}:${postedDate}:${key}:${lineType}:${index}`;
}

function pushChargeLines(
  lines: ReconciliationFinanceLine[],
  category: string,
  postedDate: string,
  orderId: string,
  sellerSKU: string | undefined,
  charges: ChargeComponent[] | undefined,
  keyPrefix: string,
): void {
  for (const [index, charge] of (charges ?? []).entries()) {
    lines.push({
      eventId: makeEventId(category, postedDate, keyPrefix, charge.ChargeType, index),
      orderId,
      sellerSKU,
      eventCategory: category,
      lineType: charge.ChargeType,
      amount: charge.ChargeAmount.CurrencyAmount,
      currency: charge.ChargeAmount.CurrencyCode,
      postedDate,
    });
  }
}

function pushFeeLines(
  lines: ReconciliationFinanceLine[],
  category: string,
  postedDate: string,
  orderId: string | undefined,
  sellerSKU: string | undefined,
  fees: FeeComponent[] | undefined,
  keyPrefix: string,
): void {
  for (const [index, fee] of (fees ?? []).entries()) {
    lines.push({
      eventId: makeEventId(category, postedDate, keyPrefix, fee.FeeType, index),
      orderId,
      sellerSKU,
      eventCategory: category,
      lineType: fee.FeeType,
      amount: fee.FeeAmount.CurrencyAmount,
      currency: fee.FeeAmount.CurrencyCode,
      postedDate,
    });
  }
}

function flattenShipmentItems(
  lines: ReconciliationFinanceLine[],
  category: string,
  postedDate: string,
  orderId: string,
  items: ShipmentItem[] | undefined,
  chargeKey: 'ItemChargeList' | 'ItemChargeAdjustmentList',
  feeKey: 'ItemFeeList' | 'ItemFeeAdjustmentList',
): void {
  for (const item of items ?? []) {
    const sku = item.SellerSKU ?? 'UNKNOWN-SKU';
    const key = orderId || sku;
    pushChargeLines(lines, category, postedDate, orderId, sku, item[chargeKey], key);
    pushFeeLines(lines, category, postedDate, orderId, sku, item[feeKey], key);
  }
}

export function normalizeFinancialEvents(
  financialEvents: SpApiFinancialEvents,
): ReconciliationFinanceLine[] {
  const lines: ReconciliationFinanceLine[] = [];

  for (const event of financialEvents.ShipmentEventList ?? []) {
    flattenShipmentItems(
      lines,
      'ShipmentEventList',
      event.PostedDate,
      event.AmazonOrderId,
      event.ShipmentItemList,
      'ItemChargeList',
      'ItemFeeList',
    );
  }

  for (const event of financialEvents.RefundEventList ?? []) {
    flattenShipmentItems(
      lines,
      'RefundEventList',
      event.PostedDate,
      event.AmazonOrderId,
      event.ShipmentItemAdjustmentList,
      'ItemChargeAdjustmentList',
      'ItemFeeAdjustmentList',
    );
  }

  for (const event of financialEvents.AdjustmentEventList ?? []) {
    const key = event.AdjustmentType;
    const items = event.AdjustmentItemList ?? [];

    if (items.length > 0) {
      for (const [index, item] of items.entries()) {
        if (!item.TotalAmount) {
          continue;
        }

        lines.push({
          eventId: makeEventId(
            'AdjustmentEventList',
            event.PostedDate,
            item.SellerSKU ?? key,
            event.AdjustmentType,
            index,
          ),
          eventCategory: 'AdjustmentEventList',
          lineType: event.AdjustmentType,
          amount: item.TotalAmount.CurrencyAmount,
          currency: item.TotalAmount.CurrencyCode,
          postedDate: event.PostedDate,
          sellerSKU: item.SellerSKU,
        });
      }
    } else {
      lines.push({
        eventId: makeEventId('AdjustmentEventList', event.PostedDate, key, event.AdjustmentType, 0),
        eventCategory: 'AdjustmentEventList',
        lineType: event.AdjustmentType,
        amount: event.AdjustmentAmount.CurrencyAmount,
        currency: event.AdjustmentAmount.CurrencyCode,
        postedDate: event.PostedDate,
      });
    }
  }

  for (const event of financialEvents.ServiceFeeEventList ?? []) {
    const key = event.AmazonOrderId ?? 'account-level';
    pushFeeLines(
      lines,
      'ServiceFeeEventList',
      event.PostedDate,
      event.AmazonOrderId,
      undefined,
      event.FeeList,
      key,
    );
  }

  for (const event of financialEvents.ChargebackEventList ?? []) {
    lines.push({
      eventId: makeEventId(
        'ChargebackEventList',
        event.PostedDate,
        event.AmazonOrderId,
        'Chargeback',
        0,
      ),
      orderId: event.AmazonOrderId,
      eventCategory: 'ChargebackEventList',
      lineType: 'Chargeback',
      amount: event.ChargebackAmount.CurrencyAmount,
      currency: event.ChargebackAmount.CurrencyCode,
      postedDate: event.PostedDate,
    });
  }

  for (const event of financialEvents.GuaranteeClaimEventList ?? []) {
    lines.push({
      eventId: makeEventId(
        'GuaranteeClaimEventList',
        event.PostedDate,
        event.AmazonOrderId,
        'GuaranteeClaim',
        0,
      ),
      orderId: event.AmazonOrderId,
      eventCategory: 'GuaranteeClaimEventList',
      lineType: 'GuaranteeClaim',
      amount: event.ClaimAmount.CurrencyAmount,
      currency: event.ClaimAmount.CurrencyCode,
      postedDate: event.PostedDate,
    });
  }

  return lines;
}
