import { knex } from 'knex';
import { Event } from '../entity/event';

// One query builder for the whole file. No `connection` → it can build SQL
// but never opens a socket, so this runs without Postgres.
const db = knex({ client: 'pg' });

describe('events query', () => {
  afterAll(async () => {
    await db.destroy();
  });

  it('selects events with a limit', () => {
    // Arrange
    const limit = 50;

    // Act
    const { sql, bindings } = db<Event>('events').select('*').limit(limit).toSQL();

    // Assert
    expect(sql).toBe('select * from "events" limit ?');
    expect(bindings).toEqual([limit]);
  });
});
