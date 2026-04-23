import { createServerClient as _createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

/**
 * Server-side Supabase client using the anon key.
 * Uses @supabase/ssr to manage cookies for session persistence.
 * Call inside Server Components, Route Handlers, and Server Actions.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return _createServerClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — session refresh is handled by proxy.ts.
          }
        },
      },
    },
  );
}
