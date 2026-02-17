import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: '**.8004scan.app' },
      { hostname: '**.zyf.ai' },
      { hostname: '**.imgur.com' },
      { hostname: '**.githubusercontent.com' },
      { hostname: '**.wikimedia.org' },
      { hostname: 'gateway.pinata.cloud' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
