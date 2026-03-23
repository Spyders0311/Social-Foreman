import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Social Foreman",
  description: "Terms of Service for Social Foreman.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14 sm:px-10">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-[#5b6870]">Effective date: March 22, 2026</p>

      <section className="mt-8 space-y-5 text-[#25333a]">
        <p>
          These Terms of Service govern your use of Social Foreman. By using the
          service, you agree to these terms.
        </p>
        <p>
          Social Foreman provides software for social media content generation,
          scheduling, and related automation tools for service businesses.
        </p>
        <p>
          Subscription fees are billed monthly unless otherwise stated. You may
          cancel at any time. No guarantees are made regarding lead volume,
          platform algorithm performance, or specific business outcomes.
        </p>
        <p>
          You are responsible for ensuring that your use of generated content and
          connected social accounts complies with applicable laws and platform
          policies.
        </p>
        <p>
          To the maximum extent permitted by law, Social Foreman is provided
          as-is without warranties, and liability is limited to the amount you
          paid in the prior billing period.
        </p>
        <p>Contact: support@socialforeman.com</p>
      </section>
    </main>
  );
}
