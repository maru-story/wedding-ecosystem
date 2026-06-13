/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wedding/shared'],
  allowedDevOrigins: ['antenna-wet-mix-cemetery.trycloudflare.com'],
};

module.exports = nextConfig;
