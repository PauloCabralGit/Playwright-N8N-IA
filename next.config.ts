import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['pg', 'pg-cloudflare'],
  turbopack: {
    resolveAlias: {
      'pg-cloudflare': 'pg-cloudflare/dist/index.js',
      'pg-cloudflare/dist/empty.js': 'pg-cloudflare/dist/index.js',
    },
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
