import {
  Subjects,
  Publisher,
  OrderCancelledEvent,
} from '@tickets-tutorial/common';

export class OrderCancelledPublisher extends Publisher<OrderCancelledEvent> {
  subject: Subjects.OrderCancelled = Subjects.OrderCancelled;
}
