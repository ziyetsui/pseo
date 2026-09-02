import type { NextConfig } from "next";

/**
 * Static export target (Cloudflare Pages): no server runtime, no ISR,
 * no image optimizer. Every dynamic segment must supply `generateStaticParams`
 * and set `dynamicParams = false`.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
