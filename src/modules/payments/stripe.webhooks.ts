import { paymentsService } from "./payments.service";

export function handleStripeWebhookEvent(event: { type: string; data?: any }) {
  return paymentsService.handleStripeWebhook(event);
}
