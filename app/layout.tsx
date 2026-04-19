import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GoEast.ai — Curated AI Skills for China",
  description:
    "Discover curated AI skills for traveling, living, and doing business in China. Built for humans and AI agents.",
  metadataBase: new URL("https://goeast.ai"),
  openGraph: {
    title: "GoEast.ai — Curated AI Skills for China",
    description:
      "Discover curated AI skills for traveling, living, and doing business in China.",
    url: "https://goeast.ai",
    siteName: "GoEast.ai",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
