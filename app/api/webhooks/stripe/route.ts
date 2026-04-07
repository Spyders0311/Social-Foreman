import Stripe from "stripe";

export const runtime = "nodejs";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(secretKey);
}

function getWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }

  return webhookSecret;
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return Response.json({ error: "Missing stripe-signature header." }, { status: 400 });
    }

    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret());

    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.paid":
      case "invoice.payment_failed":
        console.log("Stripe webhook received:", event.type, event.id);
        break;
      default:
        console.log("Unhandled Stripe webhook:", event.type);
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json(
      {
        error: "Stripe webhook handling failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
