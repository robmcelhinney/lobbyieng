import path from "path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://localhost:3000", "http://172.17.196.201:3000"],
  outputFileTracingRoot: path.join(__dirname)
}

export default nextConfig
