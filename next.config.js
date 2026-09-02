/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdf.js hace require('canvas') opcional (solo para Node); en el navegador no aplica.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};
export default nextConfig;
