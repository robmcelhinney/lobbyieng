import sqlite3 from "sqlite3"
import { open } from "sqlite"

function slugify(name) {
    return name
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
}

export default async function handler(req, res) {
    try {
        const db = await open({
            filename: "./lobbying.db",
            driver: sqlite3.Database,
        })

        const rows = await db.all(`
      SELECT person_name, job_title, lr.period
      FROM dpo_entries dpo
      JOIN lobbying_records lr ON dpo.lobbying_record_id = lr.id
      WHERE person_name IS NOT NULL AND TRIM(person_name) != ''
    `)

        const nameMap = new Map()
        for (const row of rows) {
            const ascii = row.person_name
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
                .toLowerCase()
            if (!nameMap.has(ascii)) nameMap.set(ascii, [])
            nameMap.get(ascii).push({
                name: row.person_name,
                job_title: row.job_title,
                period: row.period,
            })
        }

        const officials = Array.from(nameMap.values())
            .map((variants) => {
                // Choose the record with the latest (highest numeric) period.
                const best = variants.reduce((acc, cur) => {
                    // Compare period values converted to numbers.
                    return Number(cur.period) > Number(acc.period) ? cur : acc
                })
                return {
                    name: best.name,
                    slug: slugify(best.name),
                    job_title: best.job_title,
                    // Also return an array of all distinct periods for the official
                    periods: Array.from(
                        new Set(variants.map((v) => v.period).filter(Boolean))
                    ),
                }
            })
            .filter((off) => off && off.slug)
            .sort((a, b) => a.name.localeCompare(b.name))

        res.status(200).json(officials)
    } catch (err) {
        console.error("Error in officials index API:", err)
        res.status(500).json({
            error: "Internal server error",
            details: err.message,
        })
    }
}
