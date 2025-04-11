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
                const counted = variants.map((v) => ({
                    name: v.name,
                    job_title: v.job_title,
                    period: v.period,
                    score: v.name.split(" ").filter((w) => /^[A-Z]/.test(w))
                        .length,
                }))
                counted.sort((a, b) => b.score - a.score)
                const best = counted[0]

                return {
                    name: best.name,
                    slug: slugify(best.name),
                    job_title: best.job_title,
                    periods: Array.from(
                        new Set(variants.map((v) => v.period).filter(Boolean))
                    ),
                }
            })
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
