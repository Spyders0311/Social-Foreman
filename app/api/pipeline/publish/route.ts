import { NextResponse } from "next/server";
import { publishDuePostsPipeline } from "../../../../src/lib/scheduler";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expected = process.env.SOCIAL_FOREMAN_PIPELINE_SECRET?.trim();
  if (!expected) {
    throw new Error("Missing SOCIAL_FOREMAN_PIPELINE_SECRET");
  }

  const header = request.headers.get("x-pipeline-secret")?.trim();
  return Boolean(header && header === expected);
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await publishDuePostsPipeline();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown publish failure" },
      { status: 500 },
    );
  }
}
