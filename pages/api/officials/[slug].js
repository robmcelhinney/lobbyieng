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

function toAscii(name) {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
}

export default async function handler(req, res) {
    try {
        const { slug, page = 1 } = req.query
        const db = await open({
            filename: "./lobbying.db",
            driver: sqlite3.Database,
        })

        const dpoRows = await db.all(`
            SELECT person_name FROM dpo_entries
        `)

        const nameMap = new Map()
        for (const row of dpoRows) {
            const ascii = toAscii(row.person_name)
            if (!nameMap.has(ascii)) nameMap.set(ascii, [])
            nameMap.get(ascii).push(row.person_name)
        }

        let canonical = null

        for (const row of dpoRows) {
            const candidate = row.person_name
            if (slugify(candidate) === slug) {
                canonical = candidate
                break
            }
        }

        if (!canonical) {
            console.error("Could not resolve slug:", slug)
            return res.status(404).json({ error: "Official not found" })
        }

        const allRecords = await db.all(
            `
            SELECT lr.*
            FROM lobbying_records lr
            JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE dpo.person_name = ?
            ORDER BY lr.date_published DESC
        `,
            canonical
        )

        const PER_PAGE = 10
        const paginated = allRecords.slice(
            (page - 1) * PER_PAGE,
            page * PER_PAGE
        )

        res.status(200).json({
            name: canonical,
            slug: slugify(canonical),
            total: allRecords.length,
            page: parseInt(page),
            pages: Math.ceil(allRecords.length / PER_PAGE),
            records: paginated,
        })
    } catch (err) {
        console.error("Error in official detail API:", err)
        res.status(500).json({ error: "Internal error", details: err.message })
    }
}
