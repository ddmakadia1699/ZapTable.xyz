/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow larger payloads for menu image/PDF uploads to the parse API.
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
