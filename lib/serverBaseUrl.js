export function getServerBaseUrl(req) {
  if (process.env.INTERNAL_BASE_URL) return process.env.INTERNAL_BASE_URL
  if (req?.headers?.host) {
    const forwardedProto = req.headers["x-forwarded-proto"]
    const protoFromHeader = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : String(forwardedProto || "").split(",")[0].trim()

    const host = String(req.headers.host)
    const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)
    const protocol = protoFromHeader || (isLocalHost ? "http" : "https")

    return `${protocol}://${host}`
  }
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  return ""
}
