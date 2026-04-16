import path from "node:path";
import type { NextConfig } from "next";

const pgCloudflarePackagePath = require.resolve('pg-cloudflare/package.json');
const pgCloudflareRuntimePath = path.join(path.dirname(pgCloudflarePackagePath), 'dist', 'index.js');

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
        'pg-cloudflare': pgCloudflareRuntimePath,
        'pg-cloudflare/dist/empty.js': pgCloudflareRuntimePath,
      };
    }

    return config;
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
