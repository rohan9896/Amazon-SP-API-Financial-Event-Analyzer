import { z } from 'zod';

export const currencyAmountSchema = z.object({
  CurrencyCode: z.string(),
  CurrencyAmount: z.number(),
});

export type CurrencyAmount = z.infer<typeof currencyAmountSchema>;

export const chargeComponentSchema = z.object({
  ChargeType: z.string(),
  ChargeAmount: currencyAmountSchema,
});

export type ChargeComponent = z.infer<typeof chargeComponentSchema>;

export const feeComponentSchema = z.object({
  FeeType: z.string(),
  FeeAmount: currencyAmountSchema,
});

export type FeeComponent = z.infer<typeof feeComponentSchema>;

export const shipmentItemSchema = z.object({
  SellerSKU: z.string(),
  OrderItemId: z.string().optional(),
  QuantityShipped: z.number().int().positive(),
  ItemChargeList: z.array(chargeComponentSchema).optional(),
  ItemFeeList: z.array(feeComponentSchema).optional(),
  ItemChargeAdjustmentList: z.array(chargeComponentSchema).optional(),
  ItemFeeAdjustmentList: z.array(feeComponentSchema).optional(),
});

export type ShipmentItem = z.infer<typeof shipmentItemSchema>;

export const shipmentEventSchema = z.object({
  AmazonOrderId: z.string(),
  SellerOrderId: z.string().optional(),
  MarketplaceName: z.string(),
  PostedDate: z.string(),
  ShipmentItemList: z.array(shipmentItemSchema).optional(),
  OrderChargeList: z.array(chargeComponentSchema).optional(),
  OrderChargeAdjustmentList: z.array(chargeComponentSchema).optional(),
  ShipmentFeeList: z.array(feeComponentSchema).optional(),
  ShipmentFeeAdjustmentList: z.array(feeComponentSchema).optional(),
});

export type ShipmentEvent = z.infer<typeof shipmentEventSchema>;

export const refundEventSchema = z.object({
  AmazonOrderId: z.string(),
  SellerOrderId: z.string().optional(),
  MarketplaceName: z.string(),
  PostedDate: z.string(),
  ShipmentItemAdjustmentList: z.array(shipmentItemSchema).optional(),
});

export type RefundEvent = z.infer<typeof refundEventSchema>;

export const adjustmentEventSchema = z.object({
  AdjustmentType: z.string(),
  PostedDate: z.string(),
  AdjustmentAmount: currencyAmountSchema,
  AdjustmentItemList: z
    .array(
      z.object({
        Quantity: z.number().int().optional(),
        PerUnitAmount: currencyAmountSchema.optional(),
        TotalAmount: currencyAmountSchema.optional(),
        SellerSKU: z.string().optional(),
      }),
    )
    .optional(),
});

export type AdjustmentEvent = z.infer<typeof adjustmentEventSchema>;

export const serviceFeeEventSchema = z.object({
  FeeDescription: z.string().optional(),
  FeeReason: z.string().optional(),
  FeeList: z.array(feeComponentSchema),
  SellerSKU: z.string().optional(),
  AmazonOrderId: z.string().optional(),
  PostedDate: z.string(),
});

export type ServiceFeeEvent = z.infer<typeof serviceFeeEventSchema>;

export const chargebackEventSchema = z.object({
  AmazonOrderId: z.string(),
  PostedDate: z.string(),
  ChargebackAmount: currencyAmountSchema,
  ChargebackReasonCode: z.string().optional(),
});

export type ChargebackEvent = z.infer<typeof chargebackEventSchema>;

export const guaranteeClaimEventSchema = z.object({
  AmazonOrderId: z.string(),
  MarketplaceName: z.string().optional(),
  PostedDate: z.string(),
  ClaimAmount: currencyAmountSchema,
  ClaimReasonCode: z.string().optional(),
});

export type GuaranteeClaimEvent = z.infer<typeof guaranteeClaimEventSchema>;

export const financialEventsSchema = z.object({
  ShipmentEventList: z.array(shipmentEventSchema).optional(),
  RefundEventList: z.array(refundEventSchema).optional(),
  AdjustmentEventList: z.array(adjustmentEventSchema).optional(),
  ServiceFeeEventList: z.array(serviceFeeEventSchema).optional(),
  ChargebackEventList: z.array(chargebackEventSchema).optional(),
  GuaranteeClaimEventList: z.array(guaranteeClaimEventSchema).optional(),
});

export type FinancialEvents = z.infer<typeof financialEventsSchema>;

export const listFinancialEventsResponseSchema = z.object({
  payload: z.object({
    FinancialEvents: financialEventsSchema,
    NextToken: z.string().optional(),
  }),
});

export type ListFinancialEventsResponse = z.infer<typeof listFinancialEventsResponseSchema>;

export const spApiErrorSchema = z.object({
  errors: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      details: z.string().optional(),
    }),
  ),
});

export type SpApiError = z.infer<typeof spApiErrorSchema>;

export type FinancialEventCategory =
  | 'ShipmentEventList'
  | 'RefundEventList'
  | 'AdjustmentEventList'
  | 'ServiceFeeEventList'
  | 'ChargebackEventList'
  | 'GuaranteeClaimEventList';

export type FlatFinancialEvent = {
  category: FinancialEventCategory;
  postedDate: string;
  sortKey: string;
  event:
    | ShipmentEvent
    | RefundEvent
    | AdjustmentEvent
    | ServiceFeeEvent
    | ChargebackEvent
    | GuaranteeClaimEvent;
};

export type ListFinancialEventsQuery = {
  PostedAfter?: string;
  PostedBefore?: string;
  MaxResultsPerPage: number;
  NextToken?: string;
};

export type PaginationToken = {
  o: number;
  pa?: string;
  pb?: string;
  m: number;
};
