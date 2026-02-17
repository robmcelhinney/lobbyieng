import { getDb } from "../../lib/sqlite"

export default async function handler(req, res) {
  try {
    const db = await getDb()
    const { period } = req.query
    let rows
    if (period && period !== "All") {
      // Filter by period
      rows = await db.all(
        `SELECT DISTINCT lobbyist_name FROM lobbying_records WHERE lobbyist_name IS NOT NULL AND TRIM(lobbyist_name) != '' AND period = ?`,
        [period]
      )
    } else {
      // All periods
      rows = await db.all(
        `SELECT DISTINCT lobbyist_name FROM lobbying_records WHERE lobbyist_name IS NOT NULL AND TRIM(lobbyist_name) != ''`
      )
    }
    // Map to array of names only
    const lobbyists = rows
      .map((row) => row.lobbyist_name)
      .filter((name) => name)
      .sort((a, b) => a.localeCompare(b))
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=60")
    res.status(200).json(lobbyists)
  } catch (err) {
    console.error("Error in lobbyists API:", err)
    res.status(500).json({
      error: "Internal server error",
      details: err.message
    })
  }
}
