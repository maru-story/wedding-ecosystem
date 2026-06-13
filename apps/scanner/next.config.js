/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wedding/shared'],
  allowedDevOrigins: [
    process.env.DASHBOARD_ORIGIN?.replace('https://', '').replace('http://', ''),
    process.env.INVITATION_ORIGIN?.replace('https://', '').replace('http://', ''),
    process.env.SCANNER_ORIGIN?.replace('https://', '').replace('http://', ''),
  ].filter(Boolean),
  // Ensure service worker is served with correct headers
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
