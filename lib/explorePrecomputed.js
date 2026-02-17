import fs from "fs/promises"
import path from "path"

const PRECOMPUTED_PATH = path.join(process.cwd(), "data", "derived", "explore_insights.json")

let cachedPayload = null
let cachedMtimeMs = 0

export async function loadExplorePrecomputed() {
  try {
    const stat = await fs.stat(PRECOMPUTED_PATH)
    if (cachedPayload && cachedMtimeMs === stat.mtimeMs) {
      return cachedPayload
    }

    const raw = await fs.readFile(PRECOMPUTED_PATH, "utf-8")
    const parsed = JSON.parse(raw)
    cachedPayload = parsed
    cachedMtimeMs = stat.mtimeMs
    return parsed
  } catch {
    return null
  }
}

