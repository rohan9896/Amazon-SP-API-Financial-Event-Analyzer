import { describe, expect, it } from 'vitest';

import { normalizeFinancialEvents } from '../../src/normalize/finances.js';
import { normalizeOrder } from '../../src/normalize/orders.js';

describe('normalizeOrder', () => {
  it('parses Money.Amount strings to numbers', () => {
    const { order } = normalizeOrder({
      AmazonOrderId: '111-2345678-9012345',
      OrderStatus: 'Shipped',
      MarketplaceId: 'ATVPDKIKX0DER',
      items: [
        {
          SellerSKU: 'WIDGET-PRO-001',
          QuantityOrdered: 1,
          ItemPrice: { CurrencyCode: 'USD', Amount: '89.99' },
          ItemTax: { CurrencyCode: 'USD', Amount: '7.65' },
          ShippingPrice: { CurrencyCode: 'USD', Amount: '0.00' },
        },
      ],
    });

    expect(order.items[0].itemPrice).toBe(89.99);
    expect(order.items[0].itemTax).toBe(7.65);
  });

  it('treats missing numeric fields as 0 and records warnings', () => {
    const { order, warnings } = normalizeOrder({
      AmazonOrderId: '999-0000000-0000000',
      OrderStatus: 'Shipped',
      MarketplaceId: 'ATVPDKIKX0DER',
      items: [
        {
          SellerSKU: 'MISSING-TAX',
          QuantityOrdered: 1,
        },
      ],
    });

    expect(order.items[0].itemTax).toBe(0);
    expect(order.items[0].itemPrice).toBe(0);
    expect(warnings.some((warning) => warning.includes('missing ItemTax'))).toBe(true);
  });
});

describe('normalizeFinancialEvents', () => {
  it('flattens shipment principal and fee lines with orderId', () => {
    const lines = normalizeFinancialEvents({
      ShipmentEventList: [
        {
          AmazonOrderId: '111-2345678-9012345',
          PostedDate: '2026-05-26T10:15:00.000Z',
          ShipmentItemList: [
            {
              SellerSKU: 'WIDGET-PRO-001',
              ItemChargeList: [
                {
                  ChargeType: 'Principal',
                  ChargeAmount: { CurrencyCode: 'USD', CurrencyAmount: 89.99 },
                },
              ],
              ItemFeeList: [
                {
                  FeeType: 'Commission',
                  FeeAmount: { CurrencyCode: 'USD', CurrencyAmount: -13.5 },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(lines.some((line) => line.lineType === 'Principal' && line.amount === 89.99)).toBe(true);
    expect(lines.some((line) => line.lineType === 'Commission' && line.amount === -13.5)).toBe(true);
  });

  it('uses SKU-only adjustment lines without orderId for secondary join', () => {
    const lines = normalizeFinancialEvents({
      AdjustmentEventList: [
        {
          AdjustmentType: 'MiscAdjustment',
          PostedDate: '2026-06-01T09:30:00.000Z',
          AdjustmentAmount: { CurrencyCode: 'USD', CurrencyAmount: -22 },
          AdjustmentItemList: [
            {
              SellerSKU: 'GADGET-BASIC-002',
              TotalAmount: { CurrencyCode: 'USD', CurrencyAmount: -22 },
            },
          ],
        },
      ],
    });

    expect(lines).toHaveLength(1);
    expect(lines[0].sellerSKU).toBe('GADGET-BASIC-002');
    expect(lines[0].orderId).toBeUndefined();
  });
});
