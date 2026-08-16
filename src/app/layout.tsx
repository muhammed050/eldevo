import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Header, Footer } from "@/components/Site";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://eldevo.com"),
  title: {
    default: "ElDevo — Fast, Private Online Developer Tools",
    template: "%s | ElDevo",
  },
  description:
    "Fast browser-based developer micro-tools. Format, decode, validate and convert data with 100% client-side privacy.",
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "AcBe3Hm_jsXpaJKBlSAiibYfaJ5IqADth9t0cuH8OzU",
  },
  alternates: {
    canonical: "https://eldevo.com/",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    siteName: "ElDevo",
    type: "website",
    title: "ElDevo — Fast, Private Online Developer Tools",
    description:
      "Privacy-first developer tools that run entirely in your browser.",
    url: "https://eldevo.com/",
  },
  twitter: {
    card: "summary",
    title: "ElDevo — Developer Tools",
    description: "Fast, private browser-based developer tools.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="min-h-[calc(100vh-7rem)]">{children}</main>
        <Footer />
        <PwaRegister />
        <GoogleAnalytics gaId="G-4RK8GRMCDP" />
      </body>
    </html>
  );
}
