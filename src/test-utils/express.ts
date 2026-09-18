import { Request, Response } from 'express';

export interface FakeResponse {
  res: Response;
  statusCode: () => number;
  body: () => unknown;
}

/** Minimal stand-in for an Express request: only what the controllers read. */
export const fakeRequest = (overrides: { query?: Record<string, unknown>; body?: unknown } = {}): Request =>
  ({ query: overrides.query ?? {}, body: overrides.body }) as unknown as Request;

/** Records `status(...)` and `json(...)` so tests can assert on the HTTP outcome. */
export const fakeResponse = (): FakeResponse => {
  let status = 200;
  let payload: unknown;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json(data: unknown) {
      payload = data;
      return res;
    },
  };
  return { res: res as unknown as Response, statusCode: () => status, body: () => payload };
};
