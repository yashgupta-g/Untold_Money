import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const robotoMonoCondensed = Roboto_Mono({
  variable: "--font-roboto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UntoldMoney — AI-Powered Stock Analytics",
  description:
    "AI-powered stock analytics, portfolio management, trade journaling, and decision-support platform for retail investors and active traders.",
  keywords: ["stock analytics", "portfolio management", "trade journal", "AI finance", "technical indicators"],
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${robotoMonoCondensed.variable}`}>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
