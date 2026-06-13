import type { NextConfig } from "next";
import path from "node:path";

const workspaceRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  transpilePackages: [
    "@vedamatch/api-client",
    "@vedamatch/domain-types",
    "@vedamatch/i18n",
  ],
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.vedamatch.ru",
      },
      {
        protocol: "https",
        hostname: "api.vedamatch.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "browsing-topics=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
