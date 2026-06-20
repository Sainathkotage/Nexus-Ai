import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['169.254.131.143'],
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  outputFileTracingIncludes: {
    '/api/upload': [
      'node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs',
    ],
  },
  serverExternalPackages: ['@napi-rs/canvas', 'pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
