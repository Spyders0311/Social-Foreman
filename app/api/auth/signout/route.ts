import { NextResponse } from "next/server";
import { createServerClient } from "../../../../src/lib/supabase-server";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
