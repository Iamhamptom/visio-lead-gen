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
};

export default nextConfig;
