/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wedding/shared'],
  allowedDevOrigins: ['52a90e24a9975d96-182-10-131-106.serveousercontent.com'],
};

module.exports = nextConfig;
