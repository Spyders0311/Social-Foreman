import { readFile } from "node:fs/promises";
import path from "node:path";

const PLAN_AMOUNT_CENTS = 9900;
const PLAN_NAME = "Social Foreman Starter";

async function getStripeSecretKey() {
  if (process.env.STRIPE_SECRET_KEY) {
    return process.env.STRIPE_SECRET_KEY;
  }

  try {
    const parentEnv = await readFile(path.join(process.cwd(), "..", ".env.local"), "utf8");
    const match = parentEnv.match(/^STRIPE_SECRET_KEY=(.+)$/m);

    if (match?.[1]) {
      return match[1].trim();
    }
  } catch {
    // No parent env file found; handled below.
  }

  throw new Error("Missing STRIPE_SECRET_KEY");
}

function getOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

export async function POST(request: Request) {
  try {
    const stripeSecretKey = await getStripeSecretKey();
    const origin = getOrigin(request);

    const body = new URLSearchParams({
      mode: "subscription",
      success_url: `${origin}/success?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(PLAN_AMOUNT_CENTS),
      "line_items[0][price_data][recurring][interval]": "month",
      "line_items[0][price_data][product_data][name]": PLAN_NAME,
      "metadata[plan]": "starter_99_monthly",
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!stripeResponse.ok) {
      const stripeError = await stripeResponse.text();
      return Response.json(
        {
          error: "Unable to create checkout session.",
          details: stripeError,
        },
        { status: 502 },
      );
    }

    const session = (await stripeResponse.json()) as { url?: string };

    if (!session.url) {
      return Response.json(
        { error: "Stripe response did not include a checkout URL." },
        { status: 502 },
      );
    }

    return Response.redirect(session.url, 303);
  } catch (error) {
    return Response.json(
      {
        error: "Checkout session creation failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
