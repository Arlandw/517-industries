import type { Metadata } from "next";
import { SeamView } from "@/components/alt/seam-view";
import "./seam.css";

// Alternate design preview ("The Seam"). Not linked from the live site and kept out of search.
export const metadata: Metadata = {
  title: "517 Industries | Curiosity, put to work.",
  description: "Exploring manufacturing, artificial intelligence, and the possibilities between.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  openGraph: {
    title: "517 Industries",
    description: "Curiosity, put to work.",
    type: "website",
    images: [{ url: "/alt/seam/img/s6.webp", width: 1920, height: 822 }],
  },
};

export default function AltPreview() {
  return <SeamView />;
}
