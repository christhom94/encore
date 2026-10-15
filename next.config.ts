import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-mode badge so screenshots match the design.
  devIndicators: false,
  // Deezer covers and artist photos.
  images: { remotePatterns: [{ protocol: "https", hostname: "*.dzcdn.net" }] },
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
