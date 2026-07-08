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
  title: "GoEast.ai | AI Chinese Philosophy, I Ching & China Travel Guides",
  description:
    "Explore Chinese philosophy with AI, consult the I Ching, and get practical China travel guides for payments, transport, hospitals, and daily life. Bilingual English-Chinese.",
  metadataBase: new URL("https://www.goeast.ai"),
  keywords: [
    "AI tools for China",
    "China travel guide",
    "China payment setup",
    "Alipay for foreigners",
    "WeChat Pay guide",
    "Chinese philosophy",
    "I Ching",
    "wu wei",
    "laozi",
    "confucius",
  ],
  category: "education",
  creator: "GoEast.ai",
  publisher: "GoEast.ai",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "3z9kuvrOqe9ZRP7GWl7mi2AO4FERHhlnFe59ryDsAHY",
    yandex: "7a0573508be2216f",
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: "GoEast.ai | AI Chinese Philosophy, I Ching & China Travel Guides",
    description:
      "Bilingual AI guides for Chinese philosophy, I Ching consultation, and practical life in China: travel, payments, medical access, and translation.",
    url: "https://www.goeast.ai",
    siteName: "GoEast.ai",
    type: "website",
    images: [
      {
        url: "https://www.goeast.ai/opengraph-image",
        width: 1200,
        height: 630,
        alt: "GoEast.ai - AI tools for life in China",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GoEast.ai | AI Chinese Philosophy, I Ching & China Travel Guides",
    description:
      "Bilingual AI guides for Chinese philosophy, I Ching, and practical life in China: travel, payments, medical support, and translation.",
    images: ["https://www.goeast.ai/opengraph-image"],
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
