// /api/periods.js - Returns all available periods from the database
import { getDb } from "../../lib/sqlite"

export default async function handler(req, res) {
  try {
    const db = await getDb()
    // Get all unique periods, ordered by date_published ascending
    const rows = await db.all(
      `SELECT DISTINCT period FROM lobbying_records WHERE period IS NOT NULL AND period != '' ORDER BY date_published ASC`
    )
    // Remove any falsy or non-string periods before returning
    const periods = rows
      .map((row) => row.period)
      .filter((p) => typeof p === "string" && p.trim() && p.trim().toLowerCase() !== "false")
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=60")
    res.status(200).json({ periods })
  } catch (err) {
    res.status(500).json({
      error: "Failed to list periods",
      details: err.message
    })
  }
}
