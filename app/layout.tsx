import type { Metadata } from "next";
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
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
