import type {
  AdjustmentEvent,
  ChargebackEvent,
  FinancialEventCategory,
  FinancialEvents,
  FlatFinancialEvent,
  GuaranteeClaimEvent,
  ListFinancialEventsQuery,
  ListFinancialEventsResponse,
  PaginationToken,
  RefundEvent,
  ServiceFeeEvent,
  ShipmentEvent,
} from '../domain/financial-events.js';
import { ALL_FINANCIAL_EVENTS } from '../data/financial-events.js';

const MAX_RANGE_DAYS = 180;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class FinancialEventsServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: string,
  ) {
    super(message);
    this.name = 'FinancialEventsServiceError';
  }
}

function parseIsoDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new FinancialEventsServiceError(
      'InvalidInput',
      `Invalid date format for ${field}`,
      `${field} must be ISO 8601 date-time`,
    );
  }
  return date;
}

function encodeNextToken(token: PaginationToken): string {
  return Buffer.from(JSON.stringify(token)).toString('base64url');
}

function decodeNextToken(token: string): PaginationToken {
  try {
    const parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as PaginationToken;
    if (typeof parsed.o !== 'number' || typeof parsed.m !== 'number') {
      throw new Error('Invalid token shape');
    }
    return parsed;
  } catch {
    throw new FinancialEventsServiceError(
      'InvalidInput',
      'NextToken is invalid',
      'The provided NextToken could not be parsed',
    );
  }
}

function filterByDateRange(
  events: FlatFinancialEvent[],
  postedAfter?: string,
  postedBefore?: string,
): FlatFinancialEvent[] {
  if (!postedAfter && !postedBefore) {
    return events;
  }

  const afterDate = postedAfter ? parseIsoDate(postedAfter, 'PostedAfter') : null;
  const beforeDate = postedBefore ? parseIsoDate(postedBefore, 'PostedBefore') : null;

  if (beforeDate && !afterDate) {
    throw new FinancialEventsServiceError(
      'InvalidInput',
      'PostedAfter is required when PostedBefore is specified',
    );
  }

  if (afterDate && beforeDate && beforeDate <= afterDate) {
    throw new FinancialEventsServiceError(
      'InvalidInput',
      'PostedBefore must be later than PostedAfter',
    );
  }

  if (afterDate && beforeDate) {
    const rangeDays = (beforeDate.getTime() - afterDate.getTime()) / MS_PER_DAY;
    if (rangeDays > MAX_RANGE_DAYS) {
      return [];
    }
  }

  return events.filter((item) => {
    const posted = parseIsoDate(item.postedDate, 'event.PostedDate');

    if (afterDate && posted < afterDate) {
      return false;
    }

    if (beforeDate && posted >= beforeDate) {
      return false;
    }

    return true;
  });
}

function rebucketEvents(page: FlatFinancialEvent[]): FinancialEvents {
  const result: FinancialEvents = {};

  for (const item of page) {
    switch (item.category) {
      case 'ShipmentEventList':
        result.ShipmentEventList = result.ShipmentEventList ?? [];
        result.ShipmentEventList.push(item.event as ShipmentEvent);
        break;
      case 'RefundEventList':
        result.RefundEventList = result.RefundEventList ?? [];
        result.RefundEventList.push(item.event as RefundEvent);
        break;
      case 'AdjustmentEventList':
        result.AdjustmentEventList = result.AdjustmentEventList ?? [];
        result.AdjustmentEventList.push(item.event as AdjustmentEvent);
        break;
      case 'ServiceFeeEventList':
        result.ServiceFeeEventList = result.ServiceFeeEventList ?? [];
        result.ServiceFeeEventList.push(item.event as ServiceFeeEvent);
        break;
      case 'ChargebackEventList':
        result.ChargebackEventList = result.ChargebackEventList ?? [];
        result.ChargebackEventList.push(item.event as ChargebackEvent);
        break;
      case 'GuaranteeClaimEventList':
        result.GuaranteeClaimEventList = result.GuaranteeClaimEventList ?? [];
        result.GuaranteeClaimEventList.push(item.event as GuaranteeClaimEvent);
        break;
      default: {
        const _exhaustive: never = item.category;
        throw new Error(`Unhandled category: ${_exhaustive as FinancialEventCategory}`);
      }
    }
  }

  return result;
}

export function listFinancialEvents(
  query: ListFinancialEventsQuery,
): ListFinancialEventsResponse {
  let offset = 0;
  let postedAfter = query.PostedAfter;
  let postedBefore = query.PostedBefore;
  const maxResults = query.MaxResultsPerPage;

  if (query.NextToken) {
    const token = decodeNextToken(query.NextToken);
    offset = token.o;
    postedAfter = token.pa;
    postedBefore = token.pb;

    if (token.m !== maxResults) {
      throw new FinancialEventsServiceError(
        'InvalidInput',
        'MaxResultsPerPage must match the original request when using NextToken',
      );
    }
  }

  const filtered = filterByDateRange(ALL_FINANCIAL_EVENTS, postedAfter, postedBefore);
  const page = filtered.slice(offset, offset + maxResults);
  const nextOffset = offset + page.length;
  const hasMore = nextOffset < filtered.length;

  const payload: ListFinancialEventsResponse['payload'] = {
    FinancialEvents: rebucketEvents(page),
  };

  if (hasMore) {
    payload.NextToken = encodeNextToken({
      o: nextOffset,
      pa: postedAfter,
      pb: postedBefore,
      m: maxResults,
    });
  }

  return { payload };
}
