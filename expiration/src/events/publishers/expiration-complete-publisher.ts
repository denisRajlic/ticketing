import {
  Subjects,
  Publisher,
  ExpirationCompleteEvent,
} from '@tickets-tutorial/common';

export class ExpirationCompletePublisher extends Publisher<ExpirationCompleteEvent> {
  subject: Subjects.ExpirationComplete = Subjects.ExpirationComplete;
}
