import sqlite3 from "sqlite3"
import { open } from "sqlite"

function slugify(name) {
    return name
        .normalize("NFD")
        .replace(/[^\p{L}\p{N}]+/gu, "-") // Replace non-alphanumeric (unicode) with dash
        .replace(/-+/g, "-") // Collapse multiple dashes
        .replace(/^-|-$/g, "") // Trim leading/trailing dashes
        .toLowerCase()
}

export default async function handler(req, res) {
    try {
        const db = await open({
            filename: "./lobbying.db",
            driver: sqlite3.Database,
        })
        // Get all unique lobbyist names (non-empty)
        const rows = await db.all(
            `SELECT DISTINCT lobbyist_name FROM lobbying_records WHERE lobbyist_name IS NOT NULL AND TRIM(lobbyist_name) != ''`
        )
        // Map to objects with name and slug
        const lobbyists = rows
            .map((row) => ({
                name: row.lobbyist_name,
                slug: slugify(row.lobbyist_name),
            }))
            .filter((l) => l.name && l.slug)
            .sort((a, b) => a.name.localeCompare(b.name))
        res.status(200).json(lobbyists)
    } catch (err) {
        console.error("Error in lobbyists API:", err)
        res.status(500).json({
            error: "Internal server error",
            details: err.message,
        })
    }
}
