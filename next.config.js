/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["groq-sdk"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.g2.com" },
      { protocol: "https", hostname: "**.capterra.com" },
    ],
  },
};

module.exports = nextConfig;
