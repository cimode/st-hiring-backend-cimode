export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta extends PaginationParams {
  totalItems: number;
  totalPages: number;
}

export type ParsePaginationResult =
  | { ok: true; value: PaginationParams }
  | { ok: false; errors: { field: string; message: string }[] };

// Strict integer parsing: "1.5", "1e2", "0x10", "" and " 1 " are all rejected so a
// malformed page never silently maps to a valid one.
const parsePositiveInt = (raw: unknown): number | null => {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
};

/**
 * Parses `page` and `pageSize` from a query-string object. Missing values fall back to the
 * defaults; present-but-invalid values are reported instead of clamped, so the client learns
 * about its mistake rather than getting a different page than it asked for.
 */
export const parsePagination = (query: Record<string, unknown>): ParsePaginationResult => {
  const errors: { field: string; message: string }[] = [];

  let page = DEFAULT_PAGE;
  if (query.page !== undefined) {
    const parsed = parsePositiveInt(query.page);
    if (parsed === null) errors.push({ field: 'page', message: 'must be an integer >= 1' });
    else page = parsed;
  }

  let pageSize = DEFAULT_PAGE_SIZE;
  if (query.pageSize !== undefined) {
    const parsed = parsePositiveInt(query.pageSize);
    if (parsed === null || parsed > MAX_PAGE_SIZE) {
      errors.push({ field: 'pageSize', message: `must be an integer between 1 and ${MAX_PAGE_SIZE}` });
    } else {
      pageSize = parsed;
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: { page, pageSize } };
};

export const buildPaginationMeta = (params: PaginationParams, totalItems: number): PaginationMeta => ({
  ...params,
  totalItems,
  totalPages: Math.ceil(totalItems / params.pageSize),
});
