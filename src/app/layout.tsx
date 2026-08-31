import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eldevo — AI Workforce",
  description: "The operating system for AI employees.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}