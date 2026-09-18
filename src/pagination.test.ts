import { buildPaginationMeta, parsePagination } from './pagination';

describe('parsePagination', () => {
  it('falls back to page 1 and pageSize 20 when nothing is provided', () => {
    expect(parsePagination({})).toEqual({ ok: true, value: { page: 1, pageSize: 20 } });
  });

  it('parses valid numeric strings', () => {
    expect(parsePagination({ page: '3', pageSize: '50' })).toEqual({ ok: true, value: { page: 3, pageSize: 50 } });
  });

  it('accepts the maximum page size', () => {
    expect(parsePagination({ pageSize: '100' })).toEqual({ ok: true, value: { page: 1, pageSize: 100 } });
  });

  it.each(['0', '-1', '1.5', 'abc', '', '1e2', '0x10', ' 2'])('rejects page=%p', (page) => {
    const result = parsePagination({ page });
    expect(result).toEqual({ ok: false, errors: [{ field: 'page', message: 'must be an integer >= 1' }] });
  });

  it.each(['0', '101', 'ten', '20.0'])('rejects pageSize=%p', (pageSize) => {
    const result = parsePagination({ pageSize });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: 'pageSize', message: 'must be an integer between 1 and 100' }],
    });
  });

  it('reports both fields when both are invalid', () => {
    expect(parsePagination({ page: 'x', pageSize: '0' })).toEqual({
      ok: false,
      errors: [
        { field: 'page', message: 'must be an integer >= 1' },
        { field: 'pageSize', message: 'must be an integer between 1 and 100' },
      ],
    });
  });

  it('rejects repeated query params (arrays) instead of picking one', () => {
    expect(parsePagination({ page: ['1', '2'] }).ok).toBe(false);
  });
});

describe('buildPaginationMeta', () => {
  it('rounds totalPages up', () => {
    expect(buildPaginationMeta({ page: 1, pageSize: 20 }, 101)).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 101,
      totalPages: 6,
    });
  });

  it('returns zero pages for an empty table', () => {
    expect(buildPaginationMeta({ page: 1, pageSize: 20 }, 0).totalPages).toBe(0);
  });
});
