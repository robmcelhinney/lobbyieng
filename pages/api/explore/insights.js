import sqlite3 from "sqlite3"
import { open } from "sqlite"

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "their",
  "about",
  "were",
  "was",
  "are",
  "has",
  "have",
  "had",
  "been",
  "will",
  "would",
  "could",
  "should",
  "its",
  "our",
  "out",
  "new",
  "all",
  "any",
  "can",
  "not",
  "who",
  "carried",
  "activity",
  "activities",
  "lobbying",
  "lobbied",
  "regarding",
  "relation",
  "related",
  "support",
  "policy",
  "programme",
  "public",
  "matter",
  "matters"
])

function slugify(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function normalizeToken(raw) {
  const lowered = raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

  if (lowered.length < 3) return ""
  if (/^\d+$/.test(lowered)) return ""
  if (STOPWORDS.has(lowered)) return ""

  let stem = lowered
  if (stem.endsWith("ies") && stem.length > 4) stem = `${stem.slice(0, -3)}y`
  else if (stem.endsWith("ing") && stem.length > 5) stem = stem.slice(0, -3)
  else if (stem.endsWith("ed") && stem.length > 4) stem = stem.slice(0, -2)
  else if (stem.endsWith("es") && stem.length > 4) stem = stem.slice(0, -2)
  else if (stem.endsWith("s") && stem.length > 3) stem = stem.slice(0, -1)

  return stem.length >= 3 ? stem : ""
}

function biggestMovers(currentRows, previousRows, key) {
  const map = new Map()
  for (const row of previousRows) {
    map.set(row[key], { name: row[key], previous: row.contact_count, current: 0 })
  }
  for (const row of currentRows) {
    const existing = map.get(row[key]) || { name: row[key], previous: 0, current: 0 }
    existing.current = row.contact_count
    map.set(row[key], existing)
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      delta: row.current - row.previous,
      slug: slugify(row.name)
    }))
    .filter((row) => row.delta !== 0)
    .sort((a, b) => {
      if (b.delta !== a.delta) return b.delta - a.delta
      if (b.current !== a.current) return b.current - a.current
      return a.name.localeCompare(b.name)
    })
    .slice(0, 20)
}

export default async function handler(req, res) {
  try {
    const db = await open({
      filename: "./lobbying.db",
      driver: sqlite3.Database
    })

    const periods = await db.all(
      `
      SELECT period, MAX(date_published) AS latest_date
      FROM lobbying_records
      WHERE period IS NOT NULL AND TRIM(period) != ''
      GROUP BY period
      ORDER BY latest_date DESC
      `
    )
    const latestPeriod = periods?.[0]?.period || null
    const previousPeriod = periods?.[1]?.period || null

    const topTargetsLatest = latestPeriod
      ? await db.all(
          `
          SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM dpo_entries dpo
          JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
          WHERE lr.period = ? AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
          GROUP BY dpo.person_name
          ORDER BY contact_count DESC, dpo.person_name ASC
          LIMIT 20
          `,
          [latestPeriod]
        )
      : []

    const topTargetsLastYear = await db.all(
      `
      SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
      FROM dpo_entries dpo
      JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
      WHERE lr.date_published >= datetime('now', '-1 year')
        AND dpo.person_name IS NOT NULL
        AND TRIM(dpo.person_name) != ''
      GROUP BY dpo.person_name
      ORDER BY contact_count DESC, dpo.person_name ASC
      LIMIT 20
      `
    )

    const topLobbyistsLatest = latestPeriod
      ? await db.all(
          `
          SELECT
            lr.lobbyist_name AS name,
            COUNT(DISTINCT lr.id) AS return_count,
            COUNT(DISTINCT dpo.person_name) AS unique_targets
          FROM lobbying_records lr
          LEFT JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
          WHERE lr.period = ? AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          GROUP BY lr.lobbyist_name
          ORDER BY return_count DESC, unique_targets DESC, lr.lobbyist_name ASC
          LIMIT 20
          `,
          [latestPeriod]
        )
      : []

    const mostActiveLobbyists = await db.all(
      `
      SELECT
        lr.lobbyist_name AS name,
        COUNT(DISTINCT lr.id) AS return_count,
        COUNT(DISTINCT dpo.person_name) AS unique_targets
      FROM lobbying_records lr
      LEFT JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
      WHERE lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
      GROUP BY lr.lobbyist_name
      ORDER BY return_count DESC, unique_targets DESC, lr.lobbyist_name ASC
      LIMIT 20
      `
    )

    const currentOfficialCounts = latestPeriod
      ? await db.all(
          `
          SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM dpo_entries dpo
          JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
          WHERE lr.period = ? AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
          GROUP BY dpo.person_name
          `,
          [latestPeriod]
        )
      : []
    const previousOfficialCounts = previousPeriod
      ? await db.all(
          `
          SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM dpo_entries dpo
          JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
          WHERE lr.period = ? AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
          GROUP BY dpo.person_name
          `,
          [previousPeriod]
        )
      : []

    const currentLobbyistCounts = latestPeriod
      ? await db.all(
          `
          SELECT lr.lobbyist_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM lobbying_records lr
          WHERE lr.period = ? AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          GROUP BY lr.lobbyist_name
          `,
          [latestPeriod]
        )
      : []
    const previousLobbyistCounts = previousPeriod
      ? await db.all(
          `
          SELECT lr.lobbyist_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM lobbying_records lr
          WHERE lr.period = ? AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          GROUP BY lr.lobbyist_name
          `,
          [previousPeriod]
        )
      : []

    const biggestMoverOfficials = biggestMovers(currentOfficialCounts, previousOfficialCounts, "name")
    const biggestMoverLobbyists = biggestMovers(currentLobbyistCounts, previousLobbyistCounts, "name")

    const topPolicyAreasLatest = latestPeriod
      ? await db.all(
          `
          SELECT public_policy_area AS name, COUNT(*) AS return_count
          FROM lobbying_records
          WHERE period = ? AND public_policy_area IS NOT NULL AND TRIM(public_policy_area) != ''
          GROUP BY public_policy_area
          ORDER BY return_count DESC, public_policy_area ASC
          LIMIT 20
          `,
          [latestPeriod]
        )
      : []

    const keywordSourceRows = latestPeriod
      ? await db.all(
          `
          SELECT
            COALESCE(subject_matter, '') AS subject_matter,
            COALESCE(intended_results, '') AS intended_results,
            COALESCE(specific_details, '') AS specific_details,
            COALESCE(relevant_matter, '') AS relevant_matter
          FROM lobbying_records
          WHERE period = ?
          `,
          [latestPeriod]
        )
      : []

    const keywordCounts = new Map()
    for (const row of keywordSourceRows) {
      const text = `${row.subject_matter} ${row.intended_results} ${row.specific_details} ${row.relevant_matter}`
      const tokens = text.split(/\s+/)
      for (const rawToken of tokens) {
        const token = normalizeToken(rawToken)
        if (!token) continue
        keywordCounts.set(token, (keywordCounts.get(token) || 0) + 1)
      }
    }

    const topKeywordsLatest = Array.from(keywordCounts.entries())
      .map(([token, count]) => ({ token, count }))
      .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token))
      .slice(0, 30)

    const officialCentralityLatest = latestPeriod
      ? await db.all(
          `
          WITH edges AS (
            SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
            FROM lobbying_records lr
            JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE lr.period = ?
              AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
              AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          )
          SELECT official AS name, COUNT(DISTINCT lobbyist) AS degree
          FROM edges
          GROUP BY official
          ORDER BY degree DESC, official ASC
          LIMIT 20
          `,
          [latestPeriod]
        )
      : []

    const lobbyistCentralityLatest = latestPeriod
      ? await db.all(
          `
          WITH edges AS (
            SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
            FROM lobbying_records lr
            JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE lr.period = ?
              AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
              AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          )
          SELECT lobbyist AS name, COUNT(DISTINCT official) AS degree
          FROM edges
          GROUP BY lobbyist
          ORDER BY degree DESC, lobbyist ASC
          LIMIT 20
          `,
          [latestPeriod]
        )
      : []

    const sharedLobbyistsLatest = latestPeriod
      ? await db.all(
          `
          WITH edges AS (
            SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
            FROM lobbying_records lr
            JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE lr.period = ?
              AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
              AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          )
          SELECT
            e1.official AS official_a,
            e2.official AS official_b,
            COUNT(*) AS shared_lobbyists
          FROM edges e1
          JOIN edges e2
            ON e1.lobbyist = e2.lobbyist
           AND e1.official < e2.official
          GROUP BY e1.official, e2.official
          ORDER BY shared_lobbyists DESC, e1.official ASC, e2.official ASC
          LIMIT 20
          `,
          [latestPeriod]
        )
      : []

    const searchTerm = String(req.query.q || "").trim()
    const searchResults =
      searchTerm.length >= 2
        ? await db.all(
            `
            SELECT
              lr.id,
              lr.url,
              lr.period,
              lr.date_published,
              lr.lobbyist_name,
              COALESCE(lr.subject_matter, '') AS subject_matter,
              COALESCE(lr.intended_results, '') AS intended_results,
              GROUP_CONCAT(DISTINCT dpo.person_name) AS officials
            FROM lobbying_records lr
            LEFT JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE (
              LOWER(COALESCE(lr.subject_matter, '')) LIKE LOWER(?)
              OR LOWER(COALESCE(lr.intended_results, '')) LIKE LOWER(?)
              OR LOWER(COALESCE(lr.specific_details, '')) LIKE LOWER(?)
              OR LOWER(COALESCE(lr.relevant_matter, '')) LIKE LOWER(?)
              OR LOWER(COALESCE(lr.public_policy_area, '')) LIKE LOWER(?)
            )
            GROUP BY lr.id
            ORDER BY lr.date_published DESC
            LIMIT 50
            `,
            Array(5).fill(`%${searchTerm}%`)
          )
        : []

    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=120")
    res.status(200).json({
      generated_at: new Date().toISOString(),
      latest_period: latestPeriod,
      previous_period: previousPeriod,
      top_targets_latest: topTargetsLatest.map((row) => ({ ...row, slug: slugify(row.name) })),
      top_targets_last_year: topTargetsLastYear.map((row) => ({ ...row, slug: slugify(row.name) })),
      top_lobbyists_latest: topLobbyistsLatest.map((row) => ({ ...row, slug: slugify(row.name) })),
      most_active_lobbyists: mostActiveLobbyists.map((row) => ({ ...row, slug: slugify(row.name) })),
      biggest_mover_officials: biggestMoverOfficials,
      biggest_mover_lobbyists: biggestMoverLobbyists,
      top_policy_areas_latest: topPolicyAreasLatest,
      top_keywords_latest: topKeywordsLatest,
      official_centrality_latest: officialCentralityLatest.map((row) => ({ ...row, slug: slugify(row.name) })),
      lobbyist_centrality_latest: lobbyistCentralityLatest.map((row) => ({ ...row, slug: slugify(row.name) })),
      shared_lobbyists_latest: sharedLobbyistsLatest.map((row) => ({
        ...row,
        official_a_slug: slugify(row.official_a),
        official_b_slug: slugify(row.official_b)
      })),
      search_term: searchTerm,
      search_results: searchResults.map((row) => ({
        ...row,
        lobbyist_slug: slugify(row.lobbyist_name || ""),
        officials: row.officials ? String(row.officials).split(",").filter(Boolean) : []
      }))
    })
  } catch (err) {
    console.error("Error building exploration insights:", err)
    res.status(500).json({
      error: "Internal server error",
      details: err.message
    })
  }
}
