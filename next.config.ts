import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
