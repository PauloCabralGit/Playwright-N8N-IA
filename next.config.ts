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
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      config.resolve = config.resolve || {};
      config.resolve.conditionNames = Array.from(
        new Set([...(config.resolve.conditionNames || []), 'workerd'])
      );
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'pg-cloudflare': pgCloudflareRuntimePath,
        'pg-cloudflare/dist/empty.js': pgCloudflareRuntimePath,
      };
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^cloudflare:sockets$/,
        })
      );
    }

    return config;
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
