import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";
import { ScrollRidges } from "@/components/scroll-ridges";
import { GrainPreview } from "@/components/preview/grain-preview";

// Private Shaders preview. Not linked anywhere and kept out of search.
export const metadata: Metadata = {
  title: "517 Industries preview A, paper grain",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function Preview() {
  return <HomeView ridges={<><ScrollRidges /><GrainPreview /></>} />;
}
