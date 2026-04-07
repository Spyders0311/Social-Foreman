import Stripe from "stripe";

export type OnboardingRecord = {
  stripeEventId: string;
  createdAt: string;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  subscriptionId: string | null;
  status: string;
  notes: string[];
};

export function buildCheckoutRecord(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): OnboardingRecord {
  return {
    stripeEventId: event.id,
    createdAt: new Date().toISOString(),
    customerId: typeof session.customer === "string" ? session.customer : null,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    customerName: session.customer_details?.name ?? null,
    subscriptionId: typeof session.subscription === "string" ? session.subscription : null,
    status: "paid-awaiting-onboarding",
    notes: [
      "Stripe checkout completed.",
      "Send owner notification email.",
      "Send customer welcome email.",
      "Collect Facebook Page access.",
      "Collect business details and service area.",
    ],
  };
}

export function buildWelcomeEmail(record: OnboardingRecord) {
  const recipientName = record.customerName ?? "there";

  return {
    subject: "Welcome to Social Foreman - here’s what happens next",
    text: `Hi ${recipientName},

Thanks for signing up for Social Foreman.

You’re all set on the payment side. Now we just need a few simple things from you so we can get your content moving.

Reply to this email with:
- Business name
- City or service area
- Main services you want to promote
- Best phone number for customers to call
- Website URL
- Facebook Page URL
- Any current offer or promo you want us to mention

Also, please make sure you can log into the Facebook account that manages your business page. We’ll help with that part next.

What happens after you reply:
1. We review your business details
2. We help get your Facebook page connected
3. We build your first round of posts
4. You review it and we tighten it up if needed

Keep it simple. Even a rough reply is fine. We’ll help clean it up from there.

Thanks,
Social Foreman`,
  };
}

export function buildOwnerNotificationEmail(record: OnboardingRecord) {
  return {
    subject: `New signup: ${record.customerName ?? record.customerEmail ?? "Social Foreman customer"}`,
    text: `New Social Foreman signup

Customer
- Name: ${record.customerName ?? "unknown"}
- Email: ${record.customerEmail ?? "unknown"}

Subscription
- Status: ${record.status}
- Stripe customer ID: ${record.customerId ?? "unknown"}
- Subscription ID: ${record.subscriptionId ?? "unknown"}
- Event time: ${record.createdAt}

Next steps
1. Confirm welcome email was sent
2. Collect business details
3. Collect Facebook Page URL and admin access
4. Start first content batch`,
  };
}
