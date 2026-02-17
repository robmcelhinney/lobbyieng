import fs from "fs/promises"
import path from "path"
import sqlite3 from "sqlite3"
import { open } from "sqlite"

function toIsoOrNull(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export async function getDataMetadata() {
  let db
  try {
    db = await open({
      filename: "./lobbying.db",
      driver: sqlite3.Database
    })

    const totals = await db.get(
      `SELECT
        COUNT(*) AS total_returns,
        COUNT(DISTINCT CASE WHEN period IS NOT NULL AND TRIM(period) != '' THEN period END) AS total_periods,
        COUNT(DISTINCT CASE WHEN lobbyist_name IS NOT NULL AND TRIM(lobbyist_name) != '' THEN lobbyist_name END) AS total_lobbyists
      FROM lobbying_records`
    )

    const officials = await db.get(
      `SELECT
        COUNT(DISTINCT CASE WHEN person_name IS NOT NULL AND TRIM(person_name) != '' THEN person_name END) AS total_officials
      FROM dpo_entries`
    )

    const minMaxPublished = await db.get(
      `SELECT
        MIN(date_published) AS first_published_at,
        MAX(date_published) AS last_published_at
      FROM lobbying_records
      WHERE date_published IS NOT NULL`
    )

    let earliestPeriod = await db.get(
      `SELECT period, date_published
      FROM lobbying_records
      WHERE period IS NOT NULL AND TRIM(period) != '' AND date_published IS NOT NULL
      ORDER BY date_published ASC
      LIMIT 1`
    )

    let latestPeriod = await db.get(
      `SELECT period, date_published
      FROM lobbying_records
      WHERE period IS NOT NULL AND TRIM(period) != '' AND date_published IS NOT NULL
      ORDER BY date_published DESC
      LIMIT 1`
    )

    if (!earliestPeriod) {
      earliestPeriod = await db.get(
        `SELECT period
        FROM lobbying_records
        WHERE period IS NOT NULL AND TRIM(period) != ''
        ORDER BY period ASC
        LIMIT 1`
      )
    }

    if (!latestPeriod) {
      latestPeriod = await db.get(
        `SELECT period
        FROM lobbying_records
        WHERE period IS NOT NULL AND TRIM(period) != ''
        ORDER BY period DESC
        LIMIT 1`
      )
    }

    let dbLastModifiedAt = null
    try {
      const dbPath = path.resolve(process.cwd(), "lobbying.db")
      const stat = await fs.stat(dbPath)
      dbLastModifiedAt = new Date(stat.mtime).toISOString()
    } catch {
      dbLastModifiedAt = null
    }

    return {
      summary: {
        total_returns: totals?.total_returns ?? 0,
        total_periods: totals?.total_periods ?? 0,
        total_lobbyists: totals?.total_lobbyists ?? 0,
        total_officials: officials?.total_officials ?? 0
      },
      coverage: {
        earliest_period: earliestPeriod?.period || null,
        latest_period: latestPeriod?.period || null,
        first_published_at: toIsoOrNull(minMaxPublished?.first_published_at),
        last_published_at: toIsoOrNull(minMaxPublished?.last_published_at)
      },
      freshness: {
        db_last_modified_at: dbLastModifiedAt
      }
    }
  } finally {
    if (db) await db.close()
  }
}
