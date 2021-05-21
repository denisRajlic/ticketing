import {
  Publisher,
  Subjects,
  TicketCreatedEvent,
} from '@tickets-tutorial/common';

export class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  subject: Subjects.TicketCreated = Subjects.TicketCreated;
}
