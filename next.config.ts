import type { NextConfig } from "next";


// Force Vercel Rebuild: Added new About, Features, How It Works pages
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/dashboard',
        destination: '/',
      },
      {
        source: '/overview',
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
        source: '/signin',
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
      {
        source: '/leads',
        destination: '/',
      },
      {
        source: '/settings',
        destination: '/',
      },
      {
        source: '/reason',
        destination: '/',
      },
      {
        source: '/reach',
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
