/** @type {import('next').NextConfig} */
const path = require("path")

const nextConfig = {
  allowedDevOrigins: ["http://localhost:3000", "http://172.17.196.201:3000"],
  outputFileTracingRoot: path.join(__dirname)
}

module.exports = nextConfig
