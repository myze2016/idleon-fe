import type { NextConfig } from "next";
import { deploymentBackendOrigin } from "./deployment-config.mjs";

const backendUrl = deploymentBackendOrigin();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.50.254.22", "172.50.254.29"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
