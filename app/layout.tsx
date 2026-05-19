import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GoEast.ai — Sophie's Journey East | AI Skills for China",
  description:
    "Follow Sophie's Journey East through 3,000 years of Chinese philosophy. Plus curated AI skills for traveling and living in China.",
  metadataBase: new URL("https://goeast.ai"),
  openGraph: {
    title: "GoEast.ai — Sophie's Journey East | AI Skills for China",
    description:
      "Follow Sophie's Journey East through 3,000 years of Chinese philosophy. Plus curated AI skills for traveling and living in China.",
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
