import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite que el build de producción no falle por errores de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Permite que el build de producción no falle por errores de TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
