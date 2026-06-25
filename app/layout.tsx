import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeedbackClient from "@/components/FeedbackClient";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "../public/fonts/Inter-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Inter-latin-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Best AI Tools for Traveling in China (2026 Guide) | GoEast.ai",
  description:
    "Discover the best AI tools for traveling in China. From translation apps to navigation helpers, find everything you need for your trip.",
  metadataBase: new URL("https://www.goeast.ai"),
  verification: {
    google: "3z9kuvrOqe9ZRP7GWl7mi2AO4FERHhlnFe59ryDsAHY",
    yandex: "7a0573508be2216f",
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Best AI Tools for Traveling in China (2026 Guide) | GoEast.ai",
    description:
      "Discover the best AI tools for traveling in China. From translation apps to navigation helpers, find everything you need for your trip.",
    url: "https://www.goeast.ai",
    siteName: "GoEast.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best AI Tools for Traveling in China | GoEast.ai",
    description:
      "Curated AI skills for navigating life in China. Travel, medical, shopping, accommodation — powered by AI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@400;500&family=JetBrains+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FeedbackClient />
        <Analytics />
      </body>
    </html>
  );
}
