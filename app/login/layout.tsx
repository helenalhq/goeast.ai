import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - GoEast.ai",
  description: "Sign in to your GoEast.ai account.",
  alternates: { canonical: "/login" },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
