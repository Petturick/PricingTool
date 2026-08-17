import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    workerThreads: false,
    cssChunking: false,
  },
};

export default nextConfig;
