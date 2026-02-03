import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/dashboard',
        destination: '/',
      },
      {
        source: '/auth',
        destination: '/',
      },
      {
        source: '/login',
        destination: '/',
      },
      {
        source: '/onboarding',
        destination: '/',
      },
      {
        source: '/landing',
        destination: '/',
      },
      {
        source: '/artist-portal',
        destination: '/',
      },
      {
        source: '/billing',
        destination: '/',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
