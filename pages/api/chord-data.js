import sqlite3 from "sqlite3"

export default function handler(req, res) {
    const { official, officials, lobbyist, start_year, end_year } = req.query
    // Support multiple officials as comma-separated string or array
    let officialsList = []
    if (officials) {
        if (Array.isArray(officials)) {
            officialsList = officials
        } else {
            officialsList = officials
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
        }
    } else if (official) {
        officialsList = [official]
    }
    if (!lobbyist && officialsList.length === 0) {
        res.status(400).json({
            error: "You must provide either an official, officials, or a lobbyist query parameter.",
        })
        return
    }

    let dateFilter = ""
    let dateParams = []
    if (start_year) {
        dateFilter += " AND strftime('%Y', lr.date_published) >= ? "
        dateParams.push(start_year)
    }
    if (end_year) {
        dateFilter += " AND strftime('%Y', lr.date_published) <= ? "
        dateParams.push(end_year)
    }

    const db = new sqlite3.Database(
        "lobbying.db",
        sqlite3.OPEN_READONLY,
        (err) => {
            if (err) {
                res.status(500).json({ error: "Failed to open database" })
                return
            }
        }
    )

    let sql, params
    if (officialsList.length > 0) {
        // All lobbyists and their connections to these officials
        const placeholders = officialsList.map(() => "?").join(",")
        sql = `
        SELECT lr.lobbyist_name, de.person_name, COUNT(*) as connection_count
        FROM lobbying_records lr
        JOIN dpo_entries de ON lr.id = de.lobbying_record_id
        WHERE lr.lobbyist_name IS NOT NULL AND de.person_name IN (${placeholders})
        ${dateFilter}
        GROUP BY lr.lobbyist_name, de.person_name
        `
        params = [...officialsList, ...dateParams]
    } else {
        // All officials and their connections to this lobbyist
        sql = `
        SELECT lr.lobbyist_name, de.person_name, COUNT(*) as connection_count
        FROM lobbying_records lr
        JOIN dpo_entries de ON lr.id = de.lobbying_record_id
        WHERE lr.lobbyist_name = ? AND de.person_name IS NOT NULL
        ${dateFilter}
        GROUP BY lr.lobbyist_name, de.person_name
        `
        params = [lobbyist, ...dateParams]
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: "Database query failed" })
            db.close()
            return
        }
        let records
        if (officialsList.length > 0) {
            // Group by lobbyist, but include all officials in dpo_entries
            const grouped = {}
            rows.forEach(({ lobbyist_name, person_name, connection_count }) => {
                if (!grouped[lobbyist_name]) grouped[lobbyist_name] = []
                grouped[lobbyist_name].push({ person_name, connection_count })
            })
            records = Object.entries(grouped).map(
                ([lobbyist_name, dpo_entries]) => ({
                    lobbyist_name,
                    dpo_entries,
                })
            )
        } else {
            // Group by official
            records = [
                {
                    lobbyist_name: lobbyist,
                    dpo_entries: rows.map(
                        ({ person_name, connection_count }) => ({
                            person_name,
                            connection_count,
                        })
                    ),
                },
            ]
        }
        res.status(200).json(records || [])
        db.close()
    })
}
