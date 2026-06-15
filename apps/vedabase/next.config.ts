import type { NextConfig } from "next";
import path from "node:path";
import withPWAInit from "@ducanh2912/next-pwa";

const workspaceRoot = path.resolve(process.cwd(), "../..");

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
  reactCompiler: true,
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: [
    "@vedamatch/api-client",
    "@vedamatch/domain-types",
    "@vedamatch/i18n",
  ],
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default process.env.NODE_ENV === "development" ? nextConfig : withPWA(nextConfig);
