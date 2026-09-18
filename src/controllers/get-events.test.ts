import { createGetEventsController } from './get-events';
import { EventDAL } from '../dal/events.dal';
import { TicketsDAL } from '../dal/tickets.dal';
import { Event } from '../entity/event';
import { Ticket } from '../entity/ticket';
import { fakeRequest, fakeResponse } from '../test-utils/express';

const event = (id: number): Event =>
  ({ id, name: `Event ${id}`, date: new Date('2030-01-01'), location: 'Here', description: '' }) as Event;

const ticket = (id: number, eventId: number, status: string): Ticket =>
  ({ id, eventId, status, type: 'general', price: 1000 }) as Ticket;

const setup = (events: Event[], ticketsByEvent: Record<number, Ticket[]>, totalItems: number) => {
  const eventsDAL: jest.Mocked<EventDAL> = {
    getEvents: jest.fn().mockResolvedValue(events),
    countEvents: jest.fn().mockResolvedValue(totalItems),
  };
  const ticketsDAL: jest.Mocked<TicketsDAL> = {
    getTicketsByEvent: jest.fn(async (eventId: number) => ticketsByEvent[eventId] ?? []),
  };
  return { eventsDAL, ticketsDAL, handler: createGetEventsController({ eventsDAL, ticketsDAL }) };
};

describe('GET /events controller', () => {
  it('returns the requested page with pagination metadata', async () => {
    // Arrange
    const { handler, eventsDAL } = setup([event(1), event(2)], { 1: [ticket(10, 1, 'available')] }, 45);
    const response = fakeResponse();

    // Act
    await handler(fakeRequest({ query: { page: '2', pageSize: '20' } }), response.res);

    // Assert
    expect(eventsDAL.getEvents).toHaveBeenCalledWith(20, 20);
    expect(response.statusCode()).toBe(200);
    expect(response.body()).toEqual({
      data: [
        { ...event(1), availableTickets: [ticket(10, 1, 'available')] },
        { ...event(2), availableTickets: [] },
      ],
      pagination: { page: 2, pageSize: 20, totalItems: 45, totalPages: 3 },
    });
  });

  it('only exposes available tickets', async () => {
    // Arrange
    const tickets = [ticket(1, 1, 'available'), ticket(2, 1, 'sold'), ticket(3, 1, 'reserved')];
    const { handler } = setup([event(1)], { 1: tickets }, 1);
    const response = fakeResponse();

    // Act
    await handler(fakeRequest(), response.res);

    // Assert
    const body = response.body() as { data: Event[] };
    expect(body.data[0].availableTickets).toEqual([ticket(1, 1, 'available')]);
  });

  it('defaults to page 1 and pageSize 20', async () => {
    // Arrange
    const { handler, eventsDAL } = setup([], {}, 0);
    const response = fakeResponse();

    // Act
    await handler(fakeRequest(), response.res);

    // Assert
    expect(eventsDAL.getEvents).toHaveBeenCalledWith(20, 0);
    expect(response.body()).toEqual({ data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
  });

  it('returns an empty page (not an error) when page is beyond the last one', async () => {
    // Arrange
    const { handler } = setup([], {}, 45);
    const response = fakeResponse();

    // Act
    await handler(fakeRequest({ query: { page: '99' } }), response.res);

    // Assert
    expect(response.statusCode()).toBe(200);
    expect(response.body()).toEqual({
      data: [],
      pagination: { page: 99, pageSize: 20, totalItems: 45, totalPages: 3 },
    });
  });

  it('rejects invalid pagination with 400 and does not hit the database', async () => {
    // Arrange
    const { handler, eventsDAL, ticketsDAL } = setup([], {}, 0);
    const response = fakeResponse();

    // Act
    await handler(fakeRequest({ query: { page: '0', pageSize: '500' } }), response.res);

    // Assert
    expect(response.statusCode()).toBe(400);
    expect(response.body()).toEqual({
      error: {
        code: 'INVALID_PAGINATION',
        message: 'Invalid pagination parameters',
        details: [
          { field: 'page', message: 'must be an integer >= 1' },
          { field: 'pageSize', message: 'must be an integer between 1 and 100' },
        ],
      },
    });
    expect(eventsDAL.getEvents).not.toHaveBeenCalled();
    expect(eventsDAL.countEvents).not.toHaveBeenCalled();
    expect(ticketsDAL.getTicketsByEvent).not.toHaveBeenCalled();
  });
});
