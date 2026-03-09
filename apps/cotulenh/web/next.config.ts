import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@cotulenh/core', '@cotulenh/board', '@cotulenh/common']
};

export default nextConfig;
