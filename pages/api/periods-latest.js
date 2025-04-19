import sqlite3 from "sqlite3"
import { open } from "sqlite"

export default async function handler(req, res) {
  try {
    const db = await open({
      filename: "./lobbying.db",
      driver: sqlite3.Database
    })
    // Get the most recent period by date_published
    const row = await db.get(
      `SELECT period FROM lobbying_records WHERE period IS NOT NULL AND period != '' ORDER BY date_published DESC LIMIT 1`
    )
    if (row && row.period) {
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=60")
      res.status(200).json({ period: row.period })
    } else {
      res.status(404).json({ error: "No period found" })
    }
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
      details: err.message
    })
  }
}
