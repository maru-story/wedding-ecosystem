/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wedding/shared'],
  allowedDevOrigins: [
    process.env.DASHBOARD_ORIGIN?.replace('https://', '').replace('http://', ''),
    process.env.INVITATION_ORIGIN?.replace('https://', '').replace('http://', ''),
    process.env.SCANNER_ORIGIN?.replace('https://', '').replace('http://', ''),
  ].filter(Boolean),
  images: {
    unoptimized: process.env.NODE_ENV !== 'production',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
