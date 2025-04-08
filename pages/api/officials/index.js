import sqlite3 from "sqlite3"
import { open } from "sqlite"

// Helper to generate a slug from a name.
function slugify(name) {
    return name.toLowerCase().trim().replace(/\s+/g, "-")
}

export default async function handler(req, res) {
    try {
        const db = await open({
            filename: "./lobbying.db",
            driver: sqlite3.Database,
        })
        // Get all dpos_lobbied values from records.
        const rows = await db.all(`
      SELECT dpos_lobbied FROM lobbying_records
      WHERE dpos_lobbied IS NOT NULL AND TRIM(dpos_lobbied) != ''
    `)

        // Split each value on "::" and aggregate distinct DPO names.
        const officialsSet = new Set()
        rows.forEach((row) => {
            const parts = row.dpos_lobbied.split("::").map((s) => s.trim())
            parts.forEach((dpo) => {
                if (dpo) officialsSet.add(dpo)
            })
        })

        const officials = Array.from(officialsSet).map((name) => ({
            name,
            slug: slugify(name),
        }))

        res.status(200).json(officials)
    } catch (err) {
        console.error("Error in officials index API:", err)
        res.status(500).json({
            error: "Internal server error",
            details: err.message,
        })
    }
}
