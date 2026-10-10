import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";
import { GpuRidges } from "@/components/preview/gpu-ridges";
import { ScrollRidges } from "@/components/scroll-ridges";

// Private Shaders preview. Not linked anywhere and kept out of search.
export const metadata: Metadata = {
  title: "517 Industries preview C, GPU contour field",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function Preview() {
  return <HomeView ridges={<GpuRidges fallback={<ScrollRidges />} />} />;
}
