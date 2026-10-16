import type { NextConfig } from 'next';
const config: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  output: 'export',
  trailingSlash: false,
  images: { unoptimized: true },
  reactStrictMode: true,
  staticPageGenerationTimeout: 180,
  devIndicators: false,
  agentRules: false,
  experimental: { globalNotFound: true },
};
export default config;
