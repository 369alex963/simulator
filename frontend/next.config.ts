import type { NextConfig } from "next";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  trailingSlash: false,
  // Hide Next.js dev indicator (the "N" badge bottom-left) — production-clean look
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*/",
        destination: `${BACKEND}/api/:path*/`,
      },
      {
        source: "/api/:path*",
        destination: `${BACKEND}/api/:path*/`,
      },
      // Proxy Django-served uploaded media (brand-kit logos, favicons, etc.)
      {
        source: "/media/:path*",
        destination: `${BACKEND}/media/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "10.5.0.2" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
