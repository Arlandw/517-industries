import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit dist/client HTML for GitHub Pages. The Worker bundle is still built for local `pnpm start`.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
