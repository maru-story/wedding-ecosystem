/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wedding/shared'],
  allowedDevOrigins: ['nikon-buyer-construction-cottage.trycloudflare.com'],
};

module.exports = nextConfig;
