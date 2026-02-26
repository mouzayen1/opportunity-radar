import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "PainRadar — B2B Software Displeasure Discovery",
  description:
    "Find B2B software products with miserable paying customers. Ranked by cross-platform pain signals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
