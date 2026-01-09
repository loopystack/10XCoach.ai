/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['95.216.225.37'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '95.216.225.37',
        port: '3000',
        pathname: '/**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  allowedDevOrigins: ['95.216.225.37'],
}

module.exports = nextConfig

