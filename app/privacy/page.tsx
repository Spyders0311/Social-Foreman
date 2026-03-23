import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Social Foreman",
  description: "Privacy Policy for Social Foreman.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14 sm:px-10">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[#5b6870]">Effective date: March 22, 2026</p>

      <section className="mt-8 space-y-5 text-[#25333a]">
        <p>
          This policy explains how Social Foreman collects, uses, and protects
          your information when you use our services.
        </p>
        <p>
          We may collect account information, billing metadata, usage analytics,
          and social platform connection details necessary to provide the service.
        </p>
        <p>
          We use your information to operate and improve Social Foreman, process
          subscriptions, provide support, and communicate important service
          updates.
        </p>
        <p>
          We do not sell personal information. We may share data with trusted
          subprocessors, such as payment processors and hosting providers, solely
          for service delivery.
        </p>
        <p>
          You may request access, correction, or deletion of your data by
          contacting support@socialforeman.com.
        </p>
        <p>
          We implement reasonable safeguards, but no method of transmission or
          storage is completely secure.
        </p>
      </section>
    </main>
  );
}
