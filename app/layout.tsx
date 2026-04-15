import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Social Foreman | Social Media for Roofers & Plumbers",
  description:
    "Social media automation for roofing and plumbing companies. Generate and schedule trust-building posts for $99/month.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f7f5ef] text-[#132027]">
        <div className="flex min-h-full flex-col">
          <header className="border-b border-[#d9d2c3] bg-[#f7f5ef]">
            <div className="mx-auto flex w-full max-w-6xl items-center px-6 py-4 sm:px-10 lg:px-16">
              <Link href="/" aria-label="Social Foreman home" className="inline-flex items-center">
                <Image
                  src="/social-foreman-logo.png"
                  alt="Social Foreman"
                  width={700}
                  height={258}
                  priority
                  className="h-auto w-[220px] sm:w-[260px]"
                />
              </Link>
            </div>
          </header>

          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
