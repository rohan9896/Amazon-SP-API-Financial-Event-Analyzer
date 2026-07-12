import type { ReconciliationOrder, ReconciliationOrderItem } from '../domain/types.js';
import { parseMoneyAmount } from '../lib/money.js';

type SpApiMoney = {
  CurrencyCode?: string;
  Amount?: string;
};

type SpApiOrderItem = {
  ASIN?: string;
  SellerSKU?: string;
  OrderItemId?: string;
  Title?: string;
  QuantityOrdered?: number;
  QuantityShipped?: number;
  ItemPrice?: SpApiMoney;
  ShippingPrice?: SpApiMoney;
  ItemTax?: SpApiMoney;
};

type SpApiOrder = {
  AmazonOrderId: string;
  OrderStatus: string;
  MarketplaceId: string;
};

export type SpApiOrderWithItems = SpApiOrder & {
  items: SpApiOrderItem[];
};

function normalizeOrderItem(
  item: SpApiOrderItem,
  orderId: string,
  warnings: string[],
): ReconciliationOrderItem {
  const sellerSKU = item.SellerSKU ?? 'UNKNOWN-SKU';

  if (!item.SellerSKU) {
    warnings.push(`Order ${orderId}: item missing SellerSKU, using UNKNOWN-SKU`);
  }

  if (item.ItemPrice?.Amount === undefined) {
    warnings.push(`Order ${orderId}, SKU ${sellerSKU}: missing ItemPrice, treating as 0`);
  }

  if (item.ItemTax?.Amount === undefined) {
    warnings.push(`Order ${orderId}, SKU ${sellerSKU}: missing ItemTax, treating as 0`);
  }

  if (item.ShippingPrice?.Amount === undefined) {
    warnings.push(`Order ${orderId}, SKU ${sellerSKU}: missing ShippingPrice, treating as 0`);
  }

  return {
    sellerSKU,
    quantityOrdered: item.QuantityOrdered ?? 0,
    itemPrice: parseMoneyAmount(item.ItemPrice?.Amount),
    itemTax: parseMoneyAmount(item.ItemTax?.Amount),
    shippingPrice: parseMoneyAmount(item.ShippingPrice?.Amount),
  };
}

export function normalizeOrder(
  order: SpApiOrderWithItems,
): { order: ReconciliationOrder; warnings: string[] } {
  const warnings: string[] = [];

  const items = order.items.map((item) => normalizeOrderItem(item, order.AmazonOrderId, warnings));

  return {
    order: {
      orderId: order.AmazonOrderId,
      orderStatus: order.OrderStatus,
      marketplaceId: order.MarketplaceId,
      items,
    },
    warnings,
  };
}

export function normalizeOrders(
  orders: SpApiOrderWithItems[],
): {
  orders: ReconciliationOrder[];
  warnings: string[];
  warningsByOrderId: Record<string, string[]>;
} {
  const allWarnings: string[] = [];
  const warningsByOrderId: Record<string, string[]> = {};
  const normalized = orders.map((order) => {
    const { order: normalizedOrder, warnings } = normalizeOrder(order);
    allWarnings.push(...warnings);
    if (warnings.length > 0) {
      warningsByOrderId[order.AmazonOrderId] = warnings;
    }
    return normalizedOrder;
  });

  return { orders: normalized, warnings: allWarnings, warningsByOrderId };
}
