import { NextResponse } from "next/server";
import { generateWeeklyPlanPipeline } from "../../../../src/lib/scheduler";

export const runtime = "nodejs";

function parseIdentifier(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await generateWeeklyPlanPipeline({
      onboardingId: parseIdentifier(body, "onboardingId"),
      stripeCustomerId: parseIdentifier(body, "stripeCustomerId"),
      stripeSubscriptionId: parseIdentifier(body, "stripeSubscriptionId"),
      customerEmail: parseIdentifier(body, "customerEmail"),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown generation failure" },
      { status: 500 },
    );
  }
}
