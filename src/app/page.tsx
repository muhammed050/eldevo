import type { Metadata } from "next";
import { Home } from "@/components/Site";
import { homeFaqs } from "@/config/home-faqs";

export const metadata: Metadata = {
  title: "Free Online Developer Tools",
  description:
    "Free JSON formatter, JWT decoder, cron generator, Base64, regex, SQL and code converters. 100% client-side.",
};

export default function Page() {
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homeFaqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
      <Home />
    </>
  );
}
