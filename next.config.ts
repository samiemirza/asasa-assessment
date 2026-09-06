import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/status", destination: "/market", permanent: true }];
  },
};

export default nextConfig;
