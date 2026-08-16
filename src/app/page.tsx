import type { Metadata } from "next";
import { Home } from "@/components/Site";
export const metadata: Metadata = {
  title: "Free Online Developer Tools",
  description:
    "Free JSON formatter, JWT decoder, cron generator, Base64, regex, SQL and code converters. 100% client-side.",
};
export default function Page() {
  return <Home />;
}
