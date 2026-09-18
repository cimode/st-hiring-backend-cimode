import { createEventDAL } from './events.dal';
import { createFakeKnex, FakeKnex } from '../test-utils/fake-knex';

describe('events DAL', () => {
  let fake: FakeKnex;

  beforeEach(() => {
    fake = createFakeKnex();
  });

  afterEach(async () => {
    await fake.destroy();
  });

  it('getEvents selects one page ordered by date then id', async () => {
    // Arrange
    const rows = [{ id: 7, name: 'A' }];
    fake.willReturn(rows);
    const dal = createEventDAL(fake.db);

    // Act
    const result = await dal.getEvents(20, 40);

    // Assert
    expect(fake.queries).toEqual([
      {
        sql: 'select * from "events" order by "date" asc, "id" asc limit $1 offset $2',
        bindings: [20, 40],
      },
    ]);
    expect(result).toEqual(rows);
  });

  it('countEvents converts the bigint string pg returns into a number', async () => {
    // Arrange
    fake.willReturn([{ count: '1234' }]);
    const dal = createEventDAL(fake.db);

    // Act
    const total = await dal.countEvents();

    // Assert
    expect(fake.queries).toEqual([{ sql: 'select count(*) as "count" from "events"', bindings: [] }]);
    expect(total).toBe(1234);
  });
});
