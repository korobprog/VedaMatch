import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3.firstvds.ru",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3.twcstorage.ru",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vedamatch.ru",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.vedamatch.ru",
        pathname: "/**",
      },
    ],
  },
};

export default process.env.NODE_ENV === "development" ? nextConfig : withPWA(nextConfig);
