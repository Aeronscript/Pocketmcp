import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // On veut que le build échoue sur les erreurs de type (au lieu de les ignorer).
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
