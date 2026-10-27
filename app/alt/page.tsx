import type { Metadata } from "next";
import { AltView } from "@/components/alt/alt-view";
import "./alt.css";

// Alternate design preview. Not linked from the live site and kept out of search.
export const metadata: Metadata = {
  title: "517 Industries | Curiosity, put to work. (alternate preview)",
  description: "Independent research and development across manufacturing, artificial intelligence, and the possibilities between.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  openGraph: {
    title: "517 Industries",
    description: "Curiosity, put to work. Independent R&D across manufacturing and artificial intelligence.",
    type: "website",
    images: [{ url: "/alt/img/hero-1600.webp", width: 1600, height: 905 }],
  },
};

export default function AltPreview() {
  return <AltView />;
}
