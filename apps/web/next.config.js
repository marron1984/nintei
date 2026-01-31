/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@nintei/shared', '@nintei/i18n'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
