import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@routtes/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
