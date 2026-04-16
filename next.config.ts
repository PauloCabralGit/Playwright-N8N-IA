import path from "node:path";
import type { NextConfig } from "next";

const pgCloudflareShimPath = path.join(process.cwd(), 'app', 'lib', 'cloudflare', 'pg-cloudflare-shim.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['pg', 'pg-cloudflare'],
  turbopack: {
    resolveAlias: {
      'pg-cloudflare': pgCloudflareShimPath,
      'pg-cloudflare/dist/empty.js': pgCloudflareShimPath,
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve = config.resolve || {};
      config.resolve.conditionNames = Array.from(
        new Set([...(config.resolve.conditionNames || []), 'workerd'])
      );
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'pg-cloudflare': pgCloudflareShimPath,
        'pg-cloudflare/dist/empty.js': pgCloudflareShimPath,
      };
      config.externals = config.externals || [];
      config.externals.push(({ request }: { request?: string }, callback: (error?: Error | null, result?: string) => void) => {
        if (request === 'cloudflare:sockets') {
          return callback(null, 'module cloudflare:sockets');
        }

        return callback();
      });
    }

    return config;
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
