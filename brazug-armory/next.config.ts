import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Removido o uso de path e __dirname para evitar erro de compatibilidade ESM
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'render.worldofwarcraft.com',
      },
      {
        protocol: 'https',
        hostname: 'render-us.worldofwarcraft.com',
      },
      {
        protocol: 'https',
        hostname: 'render-eu.worldofwarcraft.com',
      },
      {
        protocol: 'https',
        hostname: 'render-tw.worldofwarcraft.com',
      },
      {
        protocol: 'https',
        hostname: 'render-kr.worldofwarcraft.com',
      },
    ],
  },
};

export default nextConfig;
