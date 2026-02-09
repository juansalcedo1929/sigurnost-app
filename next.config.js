/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },

  // Build standalone para producción (PM2 / AWS)
  output: 'standalone',

  // Para evitar problemas con Supabase
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
