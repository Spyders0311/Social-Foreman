import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "../../src/lib/supabase-server";

export default async function Nav() {
  let isLoggedIn = false;
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // Env vars may not be configured — treat as logged-out.
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[#e8e2d9] bg-white/80 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10 lg:px-16">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/social-foreman-logo.png"
            alt="Social Foreman"
            width={36}
            height={36}
            className="rounded-md"
          />
          <span className="text-xl font-bold tracking-tight text-[#132027]">Social Foreman</span>
        </Link>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-full bg-[#132027] px-5 py-2 text-sm font-semibold text-[#f8f2e8] transition hover:bg-[#21414b]"
              >
                Dashboard
              </Link>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm font-medium text-[#405058] underline underline-offset-2 hover:text-[#132027]"
                >
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-[#d9d2c3] bg-white px-5 py-2 text-sm font-semibold text-[#132027] transition hover:bg-[#f7f5ef]"
              >
                Log In
              </Link>
              <Link
                href="/#pricing"
                className="rounded-full bg-[#d69f44] px-5 py-2 text-sm font-semibold text-[#17232a] transition hover:bg-[#efb356]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
