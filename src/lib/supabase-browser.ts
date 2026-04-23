import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client using the anon key.
 * Use inside Client Components only ("use client").
 */
export function createBrowserClient() {
  return _createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
