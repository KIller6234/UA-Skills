import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000',
    NEXT_PUBLIC_SHOW_BULL_BOARD: process.env['SHOW_BULL_BOARD_LINK'] ?? 'false',
    NEXT_PUBLIC_BULL_BOARD_URL: 'http://localhost:3002',
  },
};

export default nextConfig;
