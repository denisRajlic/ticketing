import {
  Subjects,
  Publisher,
  PaymentCreatedEvent,
} from '@tickets-tutorial/common';

export class PaymentCreatedPublisher extends Publisher<PaymentCreatedEvent> {
  subject: Subjects.PaymentCreated = Subjects.PaymentCreated;
}
