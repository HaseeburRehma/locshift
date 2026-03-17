/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fix ECONNRESET socket errors on slow connections
  httpAgentOptions: {
    keepAlive: true,
  },
  // Prevent bundling issues with native node modules
  serverExternalPackages: ['@anthropic-ai/sdk', 'twilio'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

export default nextConfig
