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
  // Configuración para webpack para manejar módulos como mermaid
  webpack: (config: any) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
  // Transpilación de módulos externos
  transpilePackages: ['mermaid'],
};

export default nextConfig;
