import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development", // Disable SW in development to avoid caching issues
});

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
};

export default withSerwist(nextConfig);
