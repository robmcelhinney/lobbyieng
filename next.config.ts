/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: ['http://localhost:3000', 'http://172.17.196.201:3000'],
  },
};

module.exports = nextConfig;
