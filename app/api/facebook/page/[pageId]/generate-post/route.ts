import { fetchCustomerFacebookConnection } from "../../../../../../src/lib/customer-store";
import { fetchFacebookPages } from "../../../../../../src/lib/facebook";
import { createServerClient } from "../../../../../../src/lib/supabase-server";

export const runtime = "nodejs";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const { pageId } = await params;

  try {
    const body = (await request.json()) as {
      onboardingId?: string;
    };

    const onboardingId = body.onboardingId?.trim();
    const supabase = await createServerClient().catch(() => null);
    const { data: { user } } = supabase
      ? await supabase.auth.getUser()
      : { data: { user: null } };

    if (!user?.email && !onboardingId) {
      return Response.json({ error: "Not authenticated." }, { status: 401 });
    }

    const record = await fetchCustomerFacebookConnection(
      user?.email
        ? { customerEmail: user.email }
        : { onboardingId: onboardingId || undefined },
    );

    if (!record) {
      return Response.json({ error: "No onboarding record found." }, { status: 404 });
    }

    if (!record.facebook_long_lived_user_access_token) {
      return Response.json({ error: "Facebook not connected or token expired." }, { status: 409 });
    }

    const pages = await fetchFacebookPages(record.facebook_long_lived_user_access_token);
    if (!pages.some((page) => page.id === pageId)) {
      return Response.json({ error: "You do not have access to this page." }, { status: 403 });
    }

    const {
      business_name,
      business_type,
      service_area,
      primary_services,
      contact_phone,
      website_url,
      offer_summary,
      differentiators,
      brand_tone,
      audience_notes,
    } = record;

    if (!business_name || !business_type || !service_area || !contact_phone) {
      return Response.json({ error: "Business profile not complete" }, { status: 409 });
    }

    const servicesText = Array.isArray(primary_services) && primary_services.length
      ? primary_services.join(", ")
      : "General services";

    const userPrompt = [
      "Write a Facebook post for this local business:",
      `Business: ${business_name} (${business_type})`,
      `Location: ${service_area}`,
      `Services: ${servicesText}`,
      `Phone: ${contact_phone}`,
      website_url ? `Website: ${website_url}` : null,
      offer_summary ? `Current offer: ${offer_summary}` : null,
      differentiators ? `What sets them apart: ${differentiators}` : null,
      brand_tone ? `Brand tone: ${brand_tone}` : null,
      audience_notes ? `Audience: ${audience_notes}` : null,
      "",
      "Write one ready-to-post Facebook message. Return only the post text, no explanation.",
    ]
      .filter((line) => line !== null)
      .join("\n");

    const apiKey = getRequiredEnv("OPENAI_API_KEY");

    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a social media manager writing Facebook posts for local service businesses. Write engaging, authentic posts that sound human. Keep it under 280 characters unless a longer post makes sense. Include relevant hashtags at the end.",
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed (${response.status}).`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const message = payload.choices?.[0]?.message?.content?.trim();
    if (!message) {
      throw new Error("OpenAI returned an empty response.");
    }

    return Response.json({ message });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
