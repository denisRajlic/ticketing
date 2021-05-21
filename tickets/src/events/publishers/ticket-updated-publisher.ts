import {
  Publisher,
  Subjects,
  TicketUpdatedEvent,
} from '@tickets-tutorial/common';

export class TicketUpdatedPublisher extends Publisher<TicketUpdatedEvent> {
  subject: Subjects.TicketUpdated = Subjects.TicketUpdated;
}
