import { getDataMetadata } from "../../lib/dataMetadata"

export default async function handler(req, res) {
  try {
    const metadata = await getDataMetadata()
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=60")
    res.status(200).json(metadata)
  } catch (err) {
    res.status(500).json({
      error: "Failed to load data metadata",
      details: err.message
    })
  }
}
