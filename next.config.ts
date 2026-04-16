import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['pg', 'pg-cloudflare'],
  turbopack: {
    resolveAlias: {
      'pg-cloudflare': 'pg-cloudflare/dist/index.js',
      'pg-cloudflare/dist/empty.js': 'pg-cloudflare/dist/index.js',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'pg-cloudflare': require.resolve('pg-cloudflare/dist/index.js'),
        'pg-cloudflare/dist/empty.js': require.resolve('pg-cloudflare/dist/index.js'),
      };
    }

    return config;
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
