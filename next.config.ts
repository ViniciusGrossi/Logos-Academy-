import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This repository lives inside the Logos Tech workspace, which has its own
  // lockfile. Keep Next's module graph anchored to this application.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
