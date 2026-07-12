import type {
  AdjustmentEvent,
  ChargebackEvent,
  FlatFinancialEvent,
  GuaranteeClaimEvent,
  RefundEvent,
  ServiceFeeEvent,
  ShipmentEvent,
} from '../domain/financial-events.js';

function daysAgo(days: number, hour = 12, minute = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

function usd(amount: number) {
  return { CurrencyCode: 'USD', CurrencyAmount: amount };
}

const shipmentEvents: ShipmentEvent[] = [
  {
    AmazonOrderId: '111-2345678-9012345',
    SellerOrderId: 'SO-1001',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(45, 10, 15),
    ShipmentItemList: [
      {
        SellerSKU: 'WIDGET-PRO-001',
        OrderItemId: 'OI-1001',
        QuantityShipped: 1,
        ItemChargeList: [
          { ChargeType: 'Principal', ChargeAmount: usd(89.99) },
          { ChargeType: 'Tax', ChargeAmount: usd(7.65) },
        ],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-13.5) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-4.75) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '222-3456789-0123456',
    SellerOrderId: 'SO-1002',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(42, 14, 30),
    ShipmentItemList: [
      {
        SellerSKU: 'GADGET-BASIC-002',
        QuantityShipped: 2,
        ItemChargeList: [{ ChargeType: 'Principal', ChargeAmount: usd(49.98) }],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-7.5) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-6.2) },
          { FeeType: 'ShippingChargeback', FeeAmount: usd(-3.99) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '333-4567890-1234567',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(38, 9, 0),
    ShipmentItemList: [
      {
        SellerSKU: 'PREMIUM-KIT-003',
        QuantityShipped: 1,
        ItemChargeList: [
          { ChargeType: 'Principal', ChargeAmount: usd(149.99) },
          { ChargeType: 'Tax', ChargeAmount: usd(12.75) },
        ],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-22.5) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-5.25) },
          { FeeType: 'VariableClosingFee', FeeAmount: usd(-1.8) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '444-5678901-2345678',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(35, 16, 45),
    ShipmentItemList: [
      {
        SellerSKU: 'ACCESSORY-004',
        QuantityShipped: 3,
        ItemChargeList: [{ ChargeType: 'Principal', ChargeAmount: usd(29.97) }],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-4.5) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-4.5) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '555-6789012-3456789',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(30, 11, 20),
    ShipmentItemList: [
      {
        SellerSKU: 'BUNDLE-005',
        QuantityShipped: 1,
        ItemChargeList: [{ ChargeType: 'Principal', ChargeAmount: usd(199.99) }],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-30.0) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-6.5) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '666-7890123-4567890',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(25, 8, 30),
    ShipmentItemList: [
      {
        SellerSKU: 'STARTER-006',
        QuantityShipped: 1,
        ItemChargeList: [{ ChargeType: 'Principal', ChargeAmount: usd(24.99) }],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-3.75) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-3.22) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '777-8901234-5678901',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(20, 13, 0),
    ShipmentItemList: [
      {
        SellerSKU: 'DELUXE-007',
        QuantityShipped: 1,
        ItemChargeList: [
          { ChargeType: 'Principal', ChargeAmount: usd(79.99) },
          { ChargeType: 'Tax', ChargeAmount: usd(6.8) },
        ],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-12.0) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-4.95) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '888-9012345-6789012',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(15, 10, 45),
    ShipmentItemList: [
      {
        SellerSKU: 'VALUE-PACK-008',
        QuantityShipped: 2,
        ItemChargeList: [{ ChargeType: 'Principal', ChargeAmount: usd(39.98) }],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-6.0) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-5.1) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '999-0123456-7890123',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(10, 15, 30),
    ShipmentItemList: [
      {
        SellerSKU: 'PRO-MAX-009',
        QuantityShipped: 1,
        ItemChargeList: [{ ChargeType: 'Principal', ChargeAmount: usd(299.99) }],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-45.0) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-7.25) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '100-1234567-8901234',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(5, 9, 15),
    ShipmentItemList: [
      {
        SellerSKU: 'MINI-010',
        QuantityShipped: 1,
        ItemChargeList: [{ ChargeType: 'Principal', ChargeAmount: usd(14.99) }],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-2.25) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-2.88) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '101-2345678-9012345',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(3, 14, 0),
    ShipmentItemList: [
      {
        SellerSKU: 'HIGH-FEE-011',
        QuantityShipped: 1,
        ItemChargeList: [{ ChargeType: 'Principal', ChargeAmount: usd(59.99) }],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-18.0) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-8.5) },
          { FeeType: 'ShippingChargeback', FeeAmount: usd(-5.99) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '102-3456789-0123456',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(1, 11, 30),
    ShipmentItemList: [
      {
        SellerSKU: 'LATEST-012',
        QuantityShipped: 1,
        ItemChargeList: [
          { ChargeType: 'Principal', ChargeAmount: usd(34.99) },
          { ChargeType: 'Tax', ChargeAmount: usd(2.98) },
        ],
        ItemFeeList: [
          { FeeType: 'Commission', FeeAmount: usd(-5.25) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(-3.5) },
        ],
      },
    ],
  },
];

const refundEvents: RefundEvent[] = [
  {
    AmazonOrderId: '222-3456789-0123456',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(40, 10, 0),
    ShipmentItemAdjustmentList: [
      {
        SellerSKU: 'GADGET-BASIC-002',
        QuantityShipped: 1,
        ItemChargeAdjustmentList: [{ ChargeType: 'Principal', ChargeAmount: usd(-24.99) }],
        ItemFeeAdjustmentList: [{ FeeType: 'Commission', FeeAmount: usd(3.75) }],
      },
    ],
  },
  {
    AmazonOrderId: '555-6789012-3456789',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(28, 14, 15),
    ShipmentItemAdjustmentList: [
      {
        SellerSKU: 'BUNDLE-005',
        QuantityShipped: 1,
        ItemChargeAdjustmentList: [
          { ChargeType: 'Principal', ChargeAmount: usd(-199.99) },
          { ChargeType: 'Tax', ChargeAmount: usd(-17.0) },
        ],
        ItemFeeAdjustmentList: [
          { FeeType: 'Commission', FeeAmount: usd(30.0) },
          { FeeType: 'FBAPerUnitFulfillmentFee', FeeAmount: usd(6.5) },
        ],
      },
    ],
  },
  {
    AmazonOrderId: '777-8901234-5678901',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(18, 9, 30),
    ShipmentItemAdjustmentList: [
      {
        SellerSKU: 'DELUXE-007',
        QuantityShipped: 1,
        ItemChargeAdjustmentList: [{ ChargeType: 'Principal', ChargeAmount: usd(-79.99) }],
        ItemFeeAdjustmentList: [{ FeeType: 'Commission', FeeAmount: usd(12.0) }],
      },
    ],
  },
  {
    AmazonOrderId: '999-0123456-7890123',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(8, 16, 0),
    ShipmentItemAdjustmentList: [
      {
        SellerSKU: 'PRO-MAX-009',
        QuantityShipped: 1,
        ItemChargeAdjustmentList: [{ ChargeType: 'Principal', ChargeAmount: usd(-149.99) }],
        ItemFeeAdjustmentList: [{ FeeType: 'Commission', FeeAmount: usd(22.5) }],
      },
    ],
  },
  // SUSPICIOUS (asymmetric refund): order 333 was refunded to the customer and the
  // Commission was returned to the seller, but the FBAPerUnitFulfillmentFee (-5.25) was
  // NOT reimbursed. The seller eats the FBA fee on a returned item — worth flagging.
  {
    AmazonOrderId: '333-4567890-1234567',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(37, 11, 0),
    ShipmentItemAdjustmentList: [
      {
        SellerSKU: 'PREMIUM-KIT-003',
        QuantityShipped: 1,
        ItemChargeAdjustmentList: [
          { ChargeType: 'Principal', ChargeAmount: usd(-149.99) },
          { ChargeType: 'Tax', ChargeAmount: usd(-12.75) },
        ],
        ItemFeeAdjustmentList: [{ FeeType: 'Commission', FeeAmount: usd(22.5) }],
      },
    ],
  },
];

const adjustmentEvents: AdjustmentEvent[] = [
  {
    AdjustmentType: 'FBAInventoryReimbursement',
    PostedDate: daysAgo(33, 12, 0),
    AdjustmentAmount: usd(24.99),
    AdjustmentItemList: [
      {
        SellerSKU: 'WIDGET-PRO-001',
        Quantity: 1,
        TotalAmount: usd(24.99),
      },
    ],
  },
  {
    AdjustmentType: 'ReserveEvent',
    PostedDate: daysAgo(22, 8, 0),
    AdjustmentAmount: usd(-150.0),
  },
  {
    AdjustmentType: 'PostageBilling',
    PostedDate: daysAgo(17, 11, 45),
    AdjustmentAmount: usd(-12.5),
  },
  {
    AdjustmentType: 'MiscAdjustment',
    PostedDate: daysAgo(12, 15, 20),
    AdjustmentAmount: usd(-8.75),
    AdjustmentItemList: [
      {
        SellerSKU: 'UNKNOWN-SKU',
        TotalAmount: usd(-8.75),
      },
    ],
  },
  {
    AdjustmentType: 'FBAInventoryReimbursement',
    PostedDate: daysAgo(6, 10, 30),
    AdjustmentAmount: usd(45.0),
    AdjustmentItemList: [
      {
        SellerSKU: 'BUNDLE-005',
        Quantity: 1,
        TotalAmount: usd(45.0),
      },
    ],
  },
  // SUSPICIOUS (unexplained deduction): a MiscAdjustment of -22.00 hits the SKU from
  // order 222 with no matching fee/refund rationale. Order 222 already carried
  // Principal +49.98 and Commission/FBA/Shipping deductions, so this extra -22.00
  // pushes the order toward a negative net payout and should be reviewed.
  {
    AdjustmentType: 'MiscAdjustment',
    PostedDate: daysAgo(41, 9, 30),
    AdjustmentAmount: usd(-22.0),
    AdjustmentItemList: [
      {
        SellerSKU: 'GADGET-BASIC-002',
        Quantity: 1,
        TotalAmount: usd(-22.0),
      },
    ],
  },
];

const serviceFeeEvents: ServiceFeeEvent[] = [
  {
    FeeDescription: 'Subscription',
    FeeReason: 'Subscription',
    PostedDate: daysAgo(44, 0, 0),
    FeeList: [{ FeeType: 'Subscription', FeeAmount: usd(-39.99) }],
  },
  {
    FeeDescription: 'FBAInboundTransportationFee',
    FeeReason: 'FBAInboundTransportationFee',
    PostedDate: daysAgo(36, 0, 0),
    FeeList: [{ FeeType: 'FBAInboundTransportationFee', FeeAmount: usd(-125.0) }],
  },
  {
    FeeDescription: 'CouponRedemptionFee',
    FeeReason: 'CouponRedemptionFee',
    PostedDate: daysAgo(26, 0, 0),
    AmazonOrderId: '666-7890123-4567890',
    FeeList: [{ FeeType: 'CouponRedemptionFee', FeeAmount: usd(-2.5) }],
  },
  {
    FeeDescription: 'StorageFee',
    FeeReason: 'StorageFee',
    PostedDate: daysAgo(14, 0, 0),
    FeeList: [{ FeeType: 'StorageFee', FeeAmount: usd(-18.75) }],
  },
  {
    FeeDescription: 'Subscription',
    FeeReason: 'Subscription',
    PostedDate: daysAgo(4, 0, 0),
    FeeList: [{ FeeType: 'Subscription', FeeAmount: usd(-39.99) }],
  },
];

const chargebackEvents: ChargebackEvent[] = [
  {
    AmazonOrderId: '444-5678901-2345678',
    PostedDate: daysAgo(32, 13, 30),
    ChargebackAmount: usd(-29.97),
    ChargebackReasonCode: 'UnauthorizedTransaction',
  },
  {
    AmazonOrderId: '888-9012345-6789012',
    PostedDate: daysAgo(13, 10, 0),
    ChargebackAmount: usd(-39.98),
    ChargebackReasonCode: 'ItemNotReceived',
  },
];

const guaranteeClaimEvents: GuaranteeClaimEvent[] = [
  {
    AmazonOrderId: '333-4567890-1234567',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(34, 9, 0),
    ClaimAmount: usd(-149.99),
    ClaimReasonCode: 'AtoZGuaranteeClaim',
  },
  {
    AmazonOrderId: '101-2345678-9012345',
    MarketplaceName: 'Amazon.com',
    PostedDate: daysAgo(2, 14, 30),
    ClaimAmount: usd(-59.99),
    ClaimReasonCode: 'AtoZGuaranteeClaim',
  },
];

function flattenEvents(): FlatFinancialEvent[] {
  const flat: FlatFinancialEvent[] = [];

  for (const event of shipmentEvents) {
    flat.push({
      category: 'ShipmentEventList',
      postedDate: event.PostedDate,
      sortKey: event.AmazonOrderId,
      event,
    });
  }

  for (const event of refundEvents) {
    flat.push({
      category: 'RefundEventList',
      postedDate: event.PostedDate,
      sortKey: event.AmazonOrderId,
      event,
    });
  }

  for (const event of adjustmentEvents) {
    flat.push({
      category: 'AdjustmentEventList',
      postedDate: event.PostedDate,
      sortKey: event.AdjustmentType,
      event,
    });
  }

  for (const event of serviceFeeEvents) {
    flat.push({
      category: 'ServiceFeeEventList',
      postedDate: event.PostedDate,
      sortKey: event.FeeDescription ?? event.FeeReason ?? 'service-fee',
      event,
    });
  }

  for (const event of chargebackEvents) {
    flat.push({
      category: 'ChargebackEventList',
      postedDate: event.PostedDate,
      sortKey: event.AmazonOrderId,
      event,
    });
  }

  for (const event of guaranteeClaimEvents) {
    flat.push({
      category: 'GuaranteeClaimEventList',
      postedDate: event.PostedDate,
      sortKey: event.AmazonOrderId,
      event,
    });
  }

  return flat.sort((a, b) => {
    const dateCompare = a.postedDate.localeCompare(b.postedDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    const categoryCompare = a.category.localeCompare(b.category);
    if (categoryCompare !== 0) {
      return categoryCompare;
    }
    return a.sortKey.localeCompare(b.sortKey);
  });
}

export const ALL_FINANCIAL_EVENTS = flattenEvents();

export const SEED_EVENT_COUNT = ALL_FINANCIAL_EVENTS.length;
