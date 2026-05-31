import { getDb } from "../../lib/sqlite"

export default async function handler(req, res) {
  try {
    const db = await getDb()
    const { period } = req.query
    let rows
    if (period && period !== "All") {
      rows = await db.all(
        `
        SELECT
          MIN(TRIM(lobbyist_name)) AS name,
          COUNT(DISTINCT id) AS return_count
        FROM lobbying_records
        WHERE lobbyist_name IS NOT NULL
          AND TRIM(lobbyist_name) != ''
          AND period = ?
        GROUP BY LOWER(TRIM(lobbyist_name))
        `,
        [period]
      )
    } else {
      rows = await db.all(
        `
        SELECT
          MIN(TRIM(lobbyist_name)) AS name,
          COUNT(DISTINCT id) AS return_count
        FROM lobbying_records
        WHERE lobbyist_name IS NOT NULL
          AND TRIM(lobbyist_name) != ''
        GROUP BY LOWER(TRIM(lobbyist_name))
        `
      )
    }

    const lobbyists = rows
      .map((row) => ({
        name: row.name,
        returnCount: Number(row.return_count) || 0
      }))
      .filter((row) => row.name)
      .sort((a, b) => a.name.localeCompare(b.name))

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
