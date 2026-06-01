import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env:{
    API_URL: process.env.API_URL,
    MACHINE_INTERNAL_TOKEN: process.env.API_MACHINE_INTERNAL_TOKEN,
  },
  output: 'standalone',
};

export default nextConfig;
