import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.31.108"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.chatsyncs.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
