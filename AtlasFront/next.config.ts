import type { NextConfig } from "next";

// Files (profile pictures, course materials) are served by the S3-compatible storage.
// Local default: MinIO on http://localhost:9000 — set NEXT_PUBLIC_STORAGE_URL when it moves.
const storageUrl = new URL(process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:9000/atlaslearn");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: storageUrl.protocol.replace(":", "") as "http" | "https",
        hostname: storageUrl.hostname,
        port: storageUrl.port,
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
