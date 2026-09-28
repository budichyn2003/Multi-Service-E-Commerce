/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy API calls to the gateway during development (Phase 2 replaces
    // this with a typed API client).
    const gateway = process.env.GATEWAY_PUBLIC_URL || 'http://localhost:8080';
    return [{ source: '/api/:path*', destination: `${gateway}/api/:path*` }];
  },
};

export default nextConfig;
