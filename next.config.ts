import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Avatars Google (SSO)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Images de couverture des voyages : URL libre (D02), HTTPS uniquement
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
