import { Knex } from 'knex';
import { Event } from '../entity/event';

export interface EventDAL {
  getEvents(limit: number, offset: number): Promise<Event[]>;
  countEvents(): Promise<number>;
}

export const createEventDAL = (knex: Knex): EventDAL => {
  return {
    async getEvents(limit, offset): Promise<Event[]> {
      // `date` is not unique, so `id` is added as a tie-breaker to keep pages stable.
      return await knex<Event>('events')
        .select('*')
        .orderBy([{ column: 'date' }, { column: 'id' }])
        .limit(limit)
        .offset(offset);
    },
    async countEvents(): Promise<number> {
      // pg returns COUNT(*) as a string because it is a bigint.
      const [row] = await knex('events').count<{ count: string }[]>('* as count');
      return Number(row.count);
    },
  };
};
