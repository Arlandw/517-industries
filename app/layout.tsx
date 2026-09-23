import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "517 Industries — Curiosity, put to work.",
  description: "Independent research and development across manufacturing, artificial intelligence, and the possibilities between.",
  openGraph: { title: "517 Industries", description: "Curiosity, put to work. Independent R&D across manufacturing and artificial intelligence.", type: "website" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
