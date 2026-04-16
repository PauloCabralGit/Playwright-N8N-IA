import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['pg'],
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
