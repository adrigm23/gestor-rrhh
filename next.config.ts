import type { NextConfig } from "next";

const parseAllowedOrigins = () => {
  const raw = process.env.NEXT_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      allowedOrigins: parseAllowedOrigins(),
    },
  },
};

export default nextConfig;
