import path from "path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // For on-device testing over LAN: DEV_EXTRA_ORIGIN=http://<lan-ip>:3000 npm run dev
  allowedDevOrigins: ["http://localhost:3000", ...(process.env.DEV_EXTRA_ORIGIN ? [process.env.DEV_EXTRA_ORIGIN] : [])],
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ]
  }
}

export default nextConfig
