import type { SeedOrder } from '../domain/orders.js';

const MARKETPLACE_ID = 'ATVPDKIKX0DER'; // Amazon.com (US) — public marketplace constant, not PII

function daysAgo(days: number, hour = 12, minute = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

function money(amount: number) {
  return { CurrencyCode: 'USD', Amount: amount.toFixed(2) };
}

/**
 * Seed orders are deliberately engineered to drive reconciliation scenarios against the
 * Finances mock (src/data/financial-events.ts):
 *
 * - 111, 222, 333, 666, 888, 999: clean matches (Orders ItemPrice == Finances Principal)
 * - 444, 777: MISMATCHED — Orders expects more than Finances actually settled (shortpay)
 * - 200, 201: NO Finances record at all (payout never settled)
 * - 555: multi-item order (order -> items relationship)
 * - 300: Cancelled (excluded from reconciliation)
 * - 301: Pending (excluded from reconciliation; pricing omitted from order items, per
 *   Amazon's real getOrderItems behavior for Pending orders)
 */
export const SEED_ORDERS: SeedOrder[] = [
  {
    AmazonOrderId: '111-2345678-9012345',
    PurchaseDate: daysAgo(46, 9, 0),
    LastUpdateDate: daysAgo(45, 10, 15),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'AFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(97.64),
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0WIDGET001',
        SellerSKU: 'WIDGET-PRO-001',
        OrderItemId: 'OI-1001',
        Title: 'Widget Pro',
        QuantityOrdered: 1,
        QuantityShipped: 1,
        ItemPrice: money(89.99),
        ShippingPrice: money(0),
        ItemTax: money(7.65),
      },
    ],
  },
  {
    AmazonOrderId: '222-3456789-0123456',
    PurchaseDate: daysAgo(43, 13, 0),
    LastUpdateDate: daysAgo(42, 14, 30),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'AFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(49.98),
    NumberOfItemsShipped: 2,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0GADGET002',
        SellerSKU: 'GADGET-BASIC-002',
        OrderItemId: 'OI-1002',
        Title: 'Gadget Basic',
        QuantityOrdered: 2,
        QuantityShipped: 2,
        ItemPrice: money(49.98),
        ShippingPrice: money(0),
        ItemTax: money(0),
      },
    ],
  },
  {
    AmazonOrderId: '333-4567890-1234567',
    PurchaseDate: daysAgo(39, 8, 30),
    LastUpdateDate: daysAgo(38, 9, 0),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'AFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(162.74),
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0PREMIUM003',
        SellerSKU: 'PREMIUM-KIT-003',
        OrderItemId: 'OI-1003',
        Title: 'Premium Kit',
        QuantityOrdered: 1,
        QuantityShipped: 1,
        ItemPrice: money(149.99),
        ShippingPrice: money(0),
        ItemTax: money(12.75),
      },
    ],
  },
  {
    // MISMATCH: Orders expects 119.97 (3 x 39.99) but Finances only settled Principal 29.97
    // (3 x 9.99). Expected revenue far exceeds what Amazon actually paid out.
    AmazonOrderId: '444-5678901-2345678',
    PurchaseDate: daysAgo(36, 15, 30),
    LastUpdateDate: daysAgo(35, 16, 45),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'AFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(119.97),
    NumberOfItemsShipped: 3,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0ACCESSORY004',
        SellerSKU: 'ACCESSORY-004',
        OrderItemId: 'OI-1004',
        Title: 'Accessory Set',
        QuantityOrdered: 3,
        QuantityShipped: 3,
        ItemPrice: money(119.97),
        ShippingPrice: money(0),
        ItemTax: money(0),
      },
    ],
  },
  {
    // Multi-item order: two distinct SKUs to exercise the order -> items relationship.
    AmazonOrderId: '555-6789012-3456789',
    PurchaseDate: daysAgo(31, 10, 0),
    LastUpdateDate: daysAgo(30, 11, 20),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'AFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(216.27),
    NumberOfItemsShipped: 2,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0BUNDLE005',
        SellerSKU: 'BUNDLE-005',
        OrderItemId: 'OI-1005A',
        Title: 'Value Bundle',
        QuantityOrdered: 1,
        QuantityShipped: 1,
        ItemPrice: money(199.99),
        ShippingPrice: money(0),
        ItemTax: money(0),
      },
      {
        ASIN: 'B0EXTRA005',
        SellerSKU: 'BUNDLE-005-EXTRA',
        OrderItemId: 'OI-1005B',
        Title: 'Bundle Add-on',
        QuantityOrdered: 1,
        QuantityShipped: 1,
        ItemPrice: money(15.0),
        ShippingPrice: money(0),
        ItemTax: money(1.28),
      },
    ],
  },
  {
    AmazonOrderId: '666-7890123-4567890',
    PurchaseDate: daysAgo(26, 7, 45),
    LastUpdateDate: daysAgo(25, 8, 30),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'AFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(24.99),
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0STARTER006',
        SellerSKU: 'STARTER-006',
        OrderItemId: 'OI-1006',
        Title: 'Starter Pack',
        QuantityOrdered: 1,
        QuantityShipped: 1,
        ItemPrice: money(24.99),
        ShippingPrice: money(0),
        ItemTax: money(0),
      },
    ],
  },
  {
    // MISMATCH: Orders expects 99.99 but Finances only settled Principal 79.99 — shortpay.
    AmazonOrderId: '777-8901234-5678901',
    PurchaseDate: daysAgo(21, 12, 15),
    LastUpdateDate: daysAgo(20, 13, 0),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'AFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(106.79),
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0DELUXE007',
        SellerSKU: 'DELUXE-007',
        OrderItemId: 'OI-1007',
        Title: 'Deluxe Edition',
        QuantityOrdered: 1,
        QuantityShipped: 1,
        ItemPrice: money(99.99),
        ShippingPrice: money(0),
        ItemTax: money(6.8),
      },
    ],
  },
  {
    AmazonOrderId: '888-9012345-6789012',
    PurchaseDate: daysAgo(16, 9, 30),
    LastUpdateDate: daysAgo(15, 10, 45),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'AFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(39.98),
    NumberOfItemsShipped: 2,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0VALUEPACK008',
        SellerSKU: 'VALUE-PACK-008',
        OrderItemId: 'OI-1008',
        Title: 'Value Pack',
        QuantityOrdered: 2,
        QuantityShipped: 2,
        ItemPrice: money(39.98),
        ShippingPrice: money(0),
        ItemTax: money(0),
      },
    ],
  },
  {
    AmazonOrderId: '999-0123456-7890123',
    PurchaseDate: daysAgo(11, 14, 15),
    LastUpdateDate: daysAgo(10, 15, 30),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'AFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(299.99),
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0PROMAX009',
        SellerSKU: 'PRO-MAX-009',
        OrderItemId: 'OI-1009',
        Title: 'Pro Max',
        QuantityOrdered: 1,
        QuantityShipped: 1,
        ItemPrice: money(299.99),
        ShippingPrice: money(0),
        ItemTax: money(0),
      },
    ],
  },
  {
    // NO Finances record exists for this order at all — simulates a payout that never settled.
    AmazonOrderId: '200-1111111-1111111',
    PurchaseDate: daysAgo(9, 10, 0),
    LastUpdateDate: daysAgo(9, 10, 0),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(59.99),
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0GHOST001',
        SellerSKU: 'GHOST-ORDER-001',
        OrderItemId: 'OI-2001',
        Title: 'Unsettled Item A',
        QuantityOrdered: 1,
        QuantityShipped: 1,
        ItemPrice: money(59.99),
        ShippingPrice: money(0),
        ItemTax: money(0),
      },
    ],
  },
  {
    // NO Finances record exists for this order at all — simulates a payout that never settled.
    AmazonOrderId: '201-2222222-2222222',
    PurchaseDate: daysAgo(7, 11, 30),
    LastUpdateDate: daysAgo(7, 11, 30),
    OrderStatus: 'Shipped',
    FulfillmentChannel: 'MFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(34.5),
    NumberOfItemsShipped: 1,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0GHOST002',
        SellerSKU: 'GHOST-ORDER-002',
        OrderItemId: 'OI-2002',
        Title: 'Unsettled Item B',
        QuantityOrdered: 1,
        QuantityShipped: 1,
        ItemPrice: money(34.5),
        ShippingPrice: money(0),
        ItemTax: money(0),
      },
    ],
  },
  {
    // Cancelled — excluded from reconciliation; exercises OrderStatuses filtering.
    AmazonOrderId: '300-3333333-3333333',
    PurchaseDate: daysAgo(5, 9, 0),
    LastUpdateDate: daysAgo(4, 9, 30),
    OrderStatus: 'Canceled',
    FulfillmentChannel: 'MFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(45.0),
    NumberOfItemsShipped: 0,
    NumberOfItemsUnshipped: 0,
    items: [
      {
        ASIN: 'B0CANCEL001',
        SellerSKU: 'CANCELLED-ITEM-001',
        OrderItemId: 'OI-3001',
        Title: 'Cancelled Item',
        QuantityOrdered: 1,
        QuantityShipped: 0,
        ItemPrice: money(45.0),
        ShippingPrice: money(0),
        ItemTax: money(0),
      },
    ],
  },
  {
    // Pending — excluded from reconciliation by OrderStatus (payment not yet authorized).
    // OrderTotal is populated for shape consistency, but the reconciliation engine should
    // skip Pending/Canceled orders based on OrderStatus, not on the presence of pricing.
    // Note: getOrderItems still omits per-item pricing for Pending orders (Amazon behavior).
    AmazonOrderId: '301-4444444-4444444',
    PurchaseDate: daysAgo(1, 16, 0),
    LastUpdateDate: daysAgo(1, 16, 0),
    OrderStatus: 'Pending',
    FulfillmentChannel: 'MFN',
    MarketplaceId: MARKETPLACE_ID,
    OrderTotal: money(75.0),
    NumberOfItemsShipped: 0,
    NumberOfItemsUnshipped: 1,
    items: [
      {
        ASIN: 'B0PENDING001',
        SellerSKU: 'PENDING-ITEM-001',
        OrderItemId: 'OI-3002',
        Title: 'Pending Item',
        QuantityOrdered: 1,
        QuantityShipped: 0,
        ItemPrice: money(75.0),
        ShippingPrice: money(0),
        ItemTax: money(0),
      },
    ],
  },
];
