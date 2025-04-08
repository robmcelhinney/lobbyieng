import sqlite3 from "sqlite3"
import { open } from "sqlite"

function slugify(name) {
    return name.toLowerCase().trim().replace(/\s+/g, "-")
}

export default async function handler(req, res) {
    try {
        const { slug } = req.query
        const db = await open({
            filename: "./lobbying.db",
            driver: sqlite3.Database,
        })
        // Get all dpos_lobbied values.
        const rows = await db.all(`
      SELECT dpos_lobbied FROM lobbying_records
      WHERE dpos_lobbied IS NOT NULL AND TRIM(dpos_lobbied) != ''
    `)

        let targetName = null
        rows.forEach((row) => {
            const parts = row.dpos_lobbied.split("::").map((s) => s.trim())
            parts.forEach((dpo) => {
                if (dpo && slugify(dpo) === slug) {
                    targetName = dpo
                }
            })
        })

        if (!targetName) {
            res.status(404).json({ error: "Official not found" })
            return
        }

        // Get all records where dpos_lobbied contains the targetName.
        const records = await db.all(
            `
      SELECT * FROM lobbying_records
      WHERE dpos_lobbied LIKE ?
    `,
            `%${targetName}%`
        )

        res.status(200).json({
            name: targetName,
            total: records.length,
            records,
        })
    } catch (err) {
        console.error("Error in official detail API:", err)
        res.status(500).json({
            error: "Internal server error",
            details: err.message,
        })
    }
}
