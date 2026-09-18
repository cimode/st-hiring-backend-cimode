import { knex, Knex } from 'knex';

export interface CapturedQuery {
  sql: string;
  bindings: readonly unknown[];
}

export interface FakeKnex {
  db: Knex;
  /** Every query the code under test tried to run, in order. */
  queries: CapturedQuery[];
  /** Queue the rows the next query (FIFO) should return. */
  willReturn: (rows: unknown[]) => void;
  destroy: () => Promise<void>;
}

/**
 * A real knex instance with the pg dialect (so the generated SQL is exactly what production
 * would send) whose driver layer is replaced: nothing connects, and each query resolves with
 * the rows queued via `willReturn`. This lets DAL tests assert SQL + bindings and exercise the
 * result mapping without a database.
 */
export const createFakeKnex = (): FakeKnex => {
  const queries: CapturedQuery[] = [];
  const responses: unknown[][] = [];

  // A connection object is required for knex to create its pool; it is never used because
  // acquireRawConnection is replaced below.
  const db = knex({ client: 'pg', connection: {}, pool: { min: 0, max: 1 } });

  // knex's Client_PG internals used by the query runner.
  const client = db.client as Knex.Client & {
    acquireRawConnection: () => Promise<unknown>;
    destroyRawConnection: (conn: unknown) => Promise<void>;
    _query: (conn: unknown, obj: { sql: string; bindings: unknown[]; response?: unknown }) => Promise<unknown>;
  };
  client.acquireRawConnection = async () => ({});
  client.destroyRawConnection = async () => {};
  client._query = async (_conn, obj) => {
    queries.push({ sql: obj.sql, bindings: obj.bindings });
    const rows = responses.shift() ?? [];
    obj.response = { rows, rowCount: rows.length, command: 'SELECT', fields: [] };
    return obj;
  };

  return {
    db,
    queries,
    willReturn: (rows) => {
      responses.push(rows);
    },
    destroy: () => db.destroy(),
  };
};
