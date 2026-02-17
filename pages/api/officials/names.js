import { getDb } from "../../../lib/sqlite"

export default async function handler(req, res) {
  try {
    const db = await getDb()
    const rows = await db.all("SELECT DISTINCT person_name FROM dpo_entries")
    res.status(200).json(rows)
  } catch {
    res.status(500).json({ error: "Database query failed" })
  }
}
