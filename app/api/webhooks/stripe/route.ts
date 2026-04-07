import Stripe from "stripe";
import { sendEmail } from "../../../../src/lib/email";
import {
  buildCheckoutRecord,
  buildOwnerNotificationEmail,
  buildWelcomeEmail,
} from "../../../../src/lib/onboarding";

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
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const record = buildCheckoutRecord(event, session);
        const ownerEmail = buildOwnerNotificationEmail(record);
        const welcomeEmail = buildWelcomeEmail(record);
        const notifyAddresses = (process.env.ONBOARDING_NOTIFICATION_EMAIL ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);

        for (const notifyAddress of notifyAddresses) {
          await sendEmail({ to: notifyAddress, ...ownerEmail });
        }

        if (record.customerEmail) {
          await sendEmail({ to: record.customerEmail, ...welcomeEmail });
        }

        console.log("Stripe checkout completed:", {
          eventId: event.id,
          customerEmail: record.customerEmail,
          subscriptionId: record.subscriptionId,
          onboardingStatus: record.status,
          ownerNotificationRecipients: notifyAddresses.length,
          customerWelcomeSent: Boolean(record.customerEmail),
        });
        break;
      }
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
