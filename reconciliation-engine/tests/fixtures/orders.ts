import type { ReconciliationFinanceLine, ReconciliationOrder } from '../../src/domain/types.js';

export const DEFAULT_CONFIG = {
  commissionRate: 0.15,
  shortpayTolerance: 0.5,
};

export const cleanOrder111: ReconciliationOrder = {
  orderId: '111-2345678-9012345',
  orderStatus: 'Shipped',
  marketplaceId: 'ATVPDKIKX0DER',
  items: [
    {
      sellerSKU: 'WIDGET-PRO-001',
      quantityOrdered: 1,
      itemPrice: 89.99,
      itemTax: 7.65,
      shippingPrice: 0,
    },
  ],
};

export const cleanOrder111FinanceLines: ReconciliationFinanceLine[] = [
  {
    eventId: 'shipment:1:Principal',
    orderId: '111-2345678-9012345',
    sellerSKU: 'WIDGET-PRO-001',
    eventCategory: 'ShipmentEventList',
    lineType: 'Principal',
    amount: 89.99,
    currency: 'USD',
    postedDate: '2026-05-26T10:15:00.000Z',
  },
  {
    eventId: 'shipment:1:Tax',
    orderId: '111-2345678-9012345',
    sellerSKU: 'WIDGET-PRO-001',
    eventCategory: 'ShipmentEventList',
    lineType: 'Tax',
    amount: 7.65,
    currency: 'USD',
    postedDate: '2026-05-26T10:15:00.000Z',
  },
  {
    eventId: 'shipment:1:Commission',
    orderId: '111-2345678-9012345',
    sellerSKU: 'WIDGET-PRO-001',
    eventCategory: 'ShipmentEventList',
    lineType: 'Commission',
    amount: -13.5,
    currency: 'USD',
    postedDate: '2026-05-26T10:15:00.000Z',
  },
];

export const shortpayOrder444: ReconciliationOrder = {
  orderId: '444-5678901-2345678',
  orderStatus: 'Shipped',
  marketplaceId: 'ATVPDKIKX0DER',
  items: [
    {
      sellerSKU: 'ACCESSORY-004',
      quantityOrdered: 3,
      itemPrice: 119.97,
      itemTax: 0,
      shippingPrice: 0,
    },
  ],
};

export const shortpayOrder444FinanceLines: ReconciliationFinanceLine[] = [
  {
    eventId: 'shipment:444:Principal',
    orderId: '444-5678901-2345678',
    sellerSKU: 'ACCESSORY-004',
    eventCategory: 'ShipmentEventList',
    lineType: 'Principal',
    amount: 29.97,
    currency: 'USD',
    postedDate: '2026-06-07T16:45:00.000Z',
  },
];

export const shortpayOrder777: ReconciliationOrder = {
  orderId: '777-8901234-5678901',
  orderStatus: 'Shipped',
  marketplaceId: 'ATVPDKIKX0DER',
  items: [
    {
      sellerSKU: 'DELUXE-007',
      quantityOrdered: 1,
      itemPrice: 99.99,
      itemTax: 6.8,
      shippingPrice: 0,
    },
  ],
};

export const shortpayOrder777FinanceLines: ReconciliationFinanceLine[] = [
  {
    eventId: 'shipment:777:Principal',
    orderId: '777-8901234-5678901',
    sellerSKU: 'DELUXE-007',
    eventCategory: 'ShipmentEventList',
    lineType: 'Principal',
    amount: 79.99,
    currency: 'USD',
    postedDate: '2026-06-22T13:00:00.000Z',
  },
];

export const noSettlementOrder200: ReconciliationOrder = {
  orderId: '200-1111111-1111111',
  orderStatus: 'Shipped',
  marketplaceId: 'ATVPDKIKX0DER',
  items: [
    {
      sellerSKU: 'GHOST-ORDER-001',
      quantityOrdered: 1,
      itemPrice: 59.99,
      itemTax: 0,
      shippingPrice: 0,
    },
  ],
};

export const pendingOrder301: ReconciliationOrder = {
  orderId: '301-4444444-4444444',
  orderStatus: 'Pending',
  marketplaceId: 'ATVPDKIKX0DER',
  items: [
    {
      sellerSKU: 'PENDING-ITEM-001',
      quantityOrdered: 1,
      itemPrice: 75,
      itemTax: 0,
      shippingPrice: 0,
    },
  ],
};

export const canceledOrder300: ReconciliationOrder = {
  orderId: '300-3333333-3333333',
  orderStatus: 'Canceled',
  marketplaceId: 'ATVPDKIKX0DER',
  items: [
    {
      sellerSKU: 'CANCELLED-ITEM-001',
      quantityOrdered: 1,
      itemPrice: 45,
      itemTax: 0,
      shippingPrice: 0,
    },
  ],
};

export const multiItemOrder555: ReconciliationOrder = {
  orderId: '555-6789012-3456789',
  orderStatus: 'Shipped',
  marketplaceId: 'ATVPDKIKX0DER',
  items: [
    {
      sellerSKU: 'BUNDLE-005',
      quantityOrdered: 1,
      itemPrice: 199.99,
      itemTax: 0,
      shippingPrice: 0,
    },
    {
      sellerSKU: 'BUNDLE-005-EXTRA',
      quantityOrdered: 1,
      itemPrice: 15,
      itemTax: 1.28,
      shippingPrice: 0,
    },
  ],
};

export const partialRefundOrder222: ReconciliationOrder = {
  orderId: '222-3456789-0123456',
  orderStatus: 'Shipped',
  marketplaceId: 'ATVPDKIKX0DER',
  items: [
    {
      sellerSKU: 'GADGET-BASIC-002',
      quantityOrdered: 2,
      itemPrice: 49.98,
      itemTax: 0,
      shippingPrice: 0,
    },
  ],
};

export const partialRefundOrder222FinanceLines: ReconciliationFinanceLine[] = [
  {
    eventId: 'shipment:222:Principal',
    orderId: '222-3456789-0123456',
    sellerSKU: 'GADGET-BASIC-002',
    eventCategory: 'ShipmentEventList',
    lineType: 'Principal',
    amount: 49.98,
    currency: 'USD',
    postedDate: '2026-05-29T14:30:00.000Z',
  },
  {
    eventId: 'refund:222:Principal',
    orderId: '222-3456789-0123456',
    sellerSKU: 'GADGET-BASIC-002',
    eventCategory: 'RefundEventList',
    lineType: 'Principal',
    amount: -24.99,
    currency: 'USD',
    postedDate: '2026-06-02T10:00:00.000Z',
  },
  {
    eventId: 'adjustment:222:MiscAdjustment',
    sellerSKU: 'GADGET-BASIC-002',
    eventCategory: 'AdjustmentEventList',
    lineType: 'MiscAdjustment',
    amount: -22,
    currency: 'USD',
    postedDate: '2026-06-01T09:30:00.000Z',
  },
];
