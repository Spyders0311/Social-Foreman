import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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

const DATA_DIR = path.join(process.cwd(), "data");
const ONBOARDING_PATH = path.join(DATA_DIR, "onboarding-signups.json");

async function readRecords(): Promise<OnboardingRecord[]> {
  try {
    const raw = await readFile(ONBOARDING_PATH, "utf8");
    return JSON.parse(raw) as OnboardingRecord[];
  } catch {
    return [];
  }
}

async function writeRecords(records: OnboardingRecord[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(ONBOARDING_PATH, JSON.stringify(records, null, 2));
}

export async function upsertCheckoutRecord(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
) {
  const records = await readRecords();

  const nextRecord: OnboardingRecord = {
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

  const existingIndex = records.findIndex((record) => record.stripeEventId === event.id);

  if (existingIndex >= 0) {
    records[existingIndex] = nextRecord;
  } else {
    records.unshift(nextRecord);
  }

  await writeRecords(records);

  return nextRecord;
}

export function buildWelcomeEmail(record: OnboardingRecord) {
  const recipientName = record.customerName ?? "there";

  return {
    subject: "Welcome to Social Foreman - next steps",
    text: `Hi ${recipientName},

Welcome to Social Foreman. Your subscription is active, and we’re ready to get your onboarding moving.

Here’s what happens next:
1. Reply with your business name, service area, and core services.
2. Make sure you have admin access to your Facebook Business Page.
3. Watch for our Facebook connection instructions so we can prepare your posting workflow.
4. We’ll build your first batch of content after we get your details.

To keep this moving quickly, reply with:
- Business name
- City / service area
- Main services
- Best email + phone for customer-facing content
- Website URL
- Facebook Page URL
- Any promos or offers you want us to highlight

Thanks,
Social Foreman`,
  };
}

export function buildOwnerNotificationEmail(record: OnboardingRecord) {
  return {
    subject: `New Social Foreman signup: ${record.customerEmail ?? "unknown email"}`,
    text: `A new Social Foreman subscription was created.

Customer email: ${record.customerEmail ?? "unknown"}
Customer name: ${record.customerName ?? "unknown"}
Stripe customer ID: ${record.customerId ?? "unknown"}
Subscription ID: ${record.subscriptionId ?? "unknown"}
Status: ${record.status}
Created at: ${record.createdAt}

Next actions:
- confirm welcome email sent
- collect business details
- collect Facebook Page URL and access
- begin onboarding workflow`,
  };
}
