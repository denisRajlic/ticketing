import {
  Publisher,
  OrderCreatedEvent,
  Subjects,
} from '@tickets-tutorial/common';

export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
}
