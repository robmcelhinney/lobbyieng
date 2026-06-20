import { getDb } from "../../lib/sqlite"

export default async function handler(req, res) {
  try {
    const db = await getDb()
    const rows = await db.all(
      `
      SELECT DISTINCT substr(TRIM(period), -4) AS year
      FROM lobbying_records
      WHERE period IS NOT NULL
        AND substr(TRIM(period), -4) GLOB '[0-9][0-9][0-9][0-9]'
      ORDER BY year ASC
      `
    )
    const years = rows.map((row) => row.year).filter(Boolean)

    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=60")
    res.status(200).json({ years, latestYear: years.at(-1) || "" })
  } catch (err) {
    res.status(500).json({
      error: "Failed to list years",
      details: err.message
    })
  }
}
