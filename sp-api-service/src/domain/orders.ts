import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'PendingAvailability',
  'Pending',
  'Unshipped',
  'PartiallyShipped',
  'Shipped',
  'InvoiceUnconfirmed',
  'Canceled',
  'Unfulfillable',
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const fulfillmentChannelSchema = z.enum(['AFN', 'MFN']);

export type FulfillmentChannel = z.infer<typeof fulfillmentChannelSchema>;

/** Amazon's Orders API Money type uses a string Amount, unlike the Finances mock's numeric CurrencyAmount. */
export const moneySchema = z.object({
  CurrencyCode: z.string(),
  Amount: z.string(),
});

export type Money = z.infer<typeof moneySchema>;

export const orderSchema = z.object({
  AmazonOrderId: z.string(),
  SellerOrderId: z.string().optional(),
  PurchaseDate: z.string(),
  LastUpdateDate: z.string(),
  OrderStatus: orderStatusSchema,
  FulfillmentChannel: fulfillmentChannelSchema.optional(),
  MarketplaceId: z.string(),
  OrderTotal: moneySchema.optional(),
  NumberOfItemsShipped: z.number().int().optional(),
  NumberOfItemsUnshipped: z.number().int().optional(),
});

export type Order = z.infer<typeof orderSchema>;

export const orderItemSchema = z.object({
  ASIN: z.string(),
  SellerSKU: z.string().optional(),
  OrderItemId: z.string(),
  Title: z.string().optional(),
  QuantityOrdered: z.number().int(),
  QuantityShipped: z.number().int().optional(),
  ItemPrice: moneySchema.optional(),
  ShippingPrice: moneySchema.optional(),
  ItemTax: moneySchema.optional(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

export const getOrdersResponseSchema = z.object({
  payload: z.object({
    Orders: z.array(orderSchema),
    NextToken: z.string().optional(),
  }),
});

export type GetOrdersResponse = z.infer<typeof getOrdersResponseSchema>;

export const getOrderItemsResponseSchema = z.object({
  payload: z.object({
    AmazonOrderId: z.string(),
    OrderItems: z.array(orderItemSchema),
    NextToken: z.string().optional(),
  }),
});

export type GetOrderItemsResponse = z.infer<typeof getOrderItemsResponseSchema>;

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

export type SeedOrderItem = OrderItem;

export type SeedOrder = Order & {
  items: SeedOrderItem[];
};

export type ListOrdersQuery = {
  CreatedAfter: string;
  CreatedBefore?: string;
  OrderStatuses?: OrderStatus[];
  MarketplaceIds?: string[];
  MaxResultsPerPage: number;
  NextToken?: string;
};

export type OrdersPaginationToken = {
  o: number;
  ca: string;
  cb?: string;
  st?: OrderStatus[];
  mp?: string[];
  m: number;
};

export type OrderItemsPaginationToken = {
  o: number;
  m: number;
};
