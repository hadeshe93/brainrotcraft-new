import type { NextConfig } from 'next';
import Icons from 'unplugin-icons/webpack';
import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();

const withNextIntl = createNextIntlPlugin();
const nextConfig: NextConfig = {
  allowedDevOrigins: ['gamesramp.com'],
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    config.plugins.push(
      Icons({
        compiler: 'jsx',
        jsx: 'react',
        // beta 特性
        autoInstall: true,
      }),
    );
    return config;
  },
};

export default withNextIntl(nextConfig);

function shouldContextInitializationRun(): boolean {
  // via debugging we've seen that AsyncLocalStorage is only set in one of the
  // two processes so we're using it as the differentiator between the two
  const AsyncLocalStorage = (globalThis as unknown as { AsyncLocalStorage?: unknown })['AsyncLocalStorage'];
  return !!AsyncLocalStorage;
}
