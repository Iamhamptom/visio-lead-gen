import type { NextConfig } from "next";


// Force Vercel Rebuild: Added new About, Features, How It Works pages
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/prai', destination: 'https://prai.visioai.co', permanent: true },
      { source: '/prai/:path*', destination: 'https://prai.visioai.co/:path*', permanent: true },
    ];
  },
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
      // Only disable caching for API routes and dynamic app pages
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/(dashboard|billing|settings|leads|auth|onboarding|overview|reason|reach)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      // Allow caching for public/static pages
      {
        source: '/(about|features|how-it-works|privacy|terms|landing)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
