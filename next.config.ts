import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/status", destination: "/", permanent: true },
      { source: "/market", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
