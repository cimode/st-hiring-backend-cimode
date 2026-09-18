import { EventDAL } from "../dal/events.dal";
import { Request, Response } from "express";
import { TicketsDAL } from "../dal/tickets.dal";
import { buildPaginationMeta, parsePagination } from "../pagination";

export const createGetEventsController = ({
  eventsDAL,
  ticketsDAL,
}: {
  eventsDAL: EventDAL;
  ticketsDAL: TicketsDAL
}) => async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query);
  // `=== false` rather than `!`: the base tsconfig has no strictNullChecks, and without it
  // TypeScript only narrows the union on an explicit literal comparison.
  if (pagination.ok === false) {
    res.status(400).json({
      error: { code: 'INVALID_PAGINATION', message: 'Invalid pagination parameters', details: pagination.errors },
    });
    return;
  }

  const { page, pageSize } = pagination.value;
  const [events, totalItems] = await Promise.all([
    eventsDAL.getEvents(pageSize, (page - 1) * pageSize),
    eventsDAL.countEvents(),
  ]);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const tickets = await ticketsDAL.getTicketsByEvent(event.id);
    events[i].availableTickets = tickets.filter(ticket => ticket.status === 'available');
  }

  res.json({ data: events, pagination: buildPaginationMeta(pagination.value, totalItems) });
};
