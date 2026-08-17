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
    yandex: "a4863f6f38a0d0e5",
  },
  alternates: {
    canonical: "https://eldevo.com/",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    siteName: "ElDevo",
    type: "website",
    title: "ElDevo — Fast, Private Online Developer Tools",
    description: "Privacy-first developer tools that run entirely in your browser.",
    url: "https://eldevo.com/",
  },
  twitter: {
    card: "summary_large_image",
    title: "ElDevo — Developer Tools",
    description: "Fast, private browser-based developer tools.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ElDevo",
  url: "https://eldevo.com/",
  description: "Fast, private, browser-based developer micro-tools.",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ElDevo",
  url: "https://eldevo.com/",
  logo: "https://eldevo.com/icon-512.png",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Header />
        <main className="min-h-[calc(100vh-7rem)]">{children}</main>
        <Footer />
        <PwaRegister />
        <GoogleAnalytics gaId="G-4RK8GRMCDP" />
      </body>
    </html>
  );
}
