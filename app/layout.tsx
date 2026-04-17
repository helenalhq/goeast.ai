import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
