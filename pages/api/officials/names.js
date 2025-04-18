import sqlite3 from "sqlite3"

export default function handler(req, res) {
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
    db.all("SELECT DISTINCT person_name FROM dpo_entries", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: "Database query failed" })
            db.close()
            return
        }
        res.status(200).json(rows)
        db.close()
    })
}
