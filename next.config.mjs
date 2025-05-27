/** @type {import('next').NextConfig} */
import withPWA from '@ducanh2912/next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['placeholder.com'],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure domains for different environments
  env: {
    NEXT_PUBLIC_APP_URL: (() => {
      // For local development
      if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000';
      }
      // For production
      if (process.env.VERCEL_ENV === 'production') {
        return 'https://spend.aldotobing.online';
      }
      // For preview/staging
      return 'https://spendbeta.aldotobing.online';
    })(),
  },
  // Configure rewrites if needed for API routes
  async rewrites() {
    return [
      // Handle API routes - no rewrite needed as they're handled internally
      // This ensures API routes work in all environments
      // {
      //   source: '/api/:path*',
      //   destination: '/api/:path*',
      // },
    ];
  },
};

export default pwaConfig(nextConfig);
