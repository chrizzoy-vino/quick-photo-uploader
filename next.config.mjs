import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Lets phones on the same local network reach `next dev` for on-device testing
  // (e.g. `npm run dev -- -H 0.0.0.0` and opening the LAN IP from a smartphone).
  // Dev-mode only — has no effect on the production build/`next start`.
  allowedDevOrigins: ['192.168.*.*'],
};

export default withNextIntl(nextConfig);
