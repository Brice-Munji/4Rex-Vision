import { NextResponse } from "next/server";
import { constructWebhookEvent, isStripeConfigured } from "@/lib/stripe";

/**
 * Stripe webhook endpoint (scaffold).
 *
 * Configure STRIPE_WEBHOOK_SECRET and point your Stripe webhook here. Handle
 * events like checkout.session.completed, customer.subscription.updated and
 * invoice.paid to keep the User subscription state in sync.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { received: false, reason: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature") ?? "";
  const payload = await req.text();
  const event = await constructWebhookEvent(payload, signature);

  if (!event) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // TODO: switch on event.type and update the database accordingly.
  return NextResponse.json({ received: true });
}
