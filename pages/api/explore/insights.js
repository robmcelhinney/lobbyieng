import { getDb } from "../../../lib/sqlite"
import { buildCacheKey, readCache, writeCache } from "../../../lib/serverCache"

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
    const searchTerm = String(req.query.q || "").trim()
    const requestedYear = typeof req.query.year === "string" ? req.query.year.trim() : ""
    const requestedMode = requestedYear === "all" ? "all" : /^\d{4}$/.test(requestedYear) ? requestedYear : ""
    const cacheKey = buildCacheKey("explore-insights", { q: searchTerm, year: requestedMode })
    const cached = readCache(cacheKey)
    if (cached) {
      res.setHeader("X-Data-Cache", "HIT")
      res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=120")
      res.status(200).json(cached)
      return
    }

    const db = await getDb()

    const years = await db.all(
      `
      SELECT DISTINCT substr(TRIM(period), -4) AS year
      FROM lobbying_records
      WHERE period IS NOT NULL
        AND TRIM(period) != ''
        AND substr(TRIM(period), -4) GLOB '[0-9][0-9][0-9][0-9]'
      ORDER BY year DESC
      `
    )
    const latestYear = years?.[0]?.year || null
    const isAllTime = requestedMode === "all"
    const selectedYear = !isAllTime && requestedMode && years.some((row) => row.year === requestedMode) ? requestedMode : latestYear
    const selectedIndex = selectedYear ? years.findIndex((row) => row.year === selectedYear) : -1
    const previousYear = !isAllTime && selectedIndex >= 0 ? years?.[selectedIndex + 1]?.year || null : null
    const yearFilter = isAllTime ? "" : selectedYear

    const topTargetsSelected = yearFilter
      ? await db.all(
          `
          SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM dpo_entries dpo
          JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
          WHERE substr(TRIM(lr.period), -4) = ? AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
          GROUP BY dpo.person_name
          ORDER BY contact_count DESC, dpo.person_name ASC
          LIMIT 20
          `,
          [yearFilter]
        )
      : await db.all(
          `
          SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM dpo_entries dpo
          JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
          WHERE dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
          GROUP BY dpo.person_name
          ORDER BY contact_count DESC, dpo.person_name ASC
          LIMIT 20
          `
        )
    const topLobbyistsSelected = yearFilter
      ? await db.all(
          `
          SELECT
            lr.lobbyist_name AS name,
            COUNT(DISTINCT lr.id) AS return_count,
            COUNT(DISTINCT dpo.person_name) AS unique_targets
          FROM lobbying_records lr
          LEFT JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
          WHERE substr(TRIM(lr.period), -4) = ? AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          GROUP BY lr.lobbyist_name
          ORDER BY return_count DESC, unique_targets DESC, lr.lobbyist_name ASC
          LIMIT 20
          `,
          [yearFilter]
        )
      : await db.all(
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
    const currentOfficialCounts = yearFilter
      ? await db.all(
          `
          SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM dpo_entries dpo
          JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
          WHERE substr(TRIM(lr.period), -4) = ? AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
          GROUP BY dpo.person_name
          `,
          [yearFilter]
        )
      : []
    const previousOfficialCounts = previousYear
      ? await db.all(
          `
          SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM dpo_entries dpo
          JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
          WHERE substr(TRIM(lr.period), -4) = ? AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
          GROUP BY dpo.person_name
          `,
          [previousYear]
        )
      : []

    const currentLobbyistCounts = yearFilter
      ? await db.all(
          `
          SELECT lr.lobbyist_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM lobbying_records lr
          WHERE substr(TRIM(lr.period), -4) = ? AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          GROUP BY lr.lobbyist_name
          `,
          [yearFilter]
        )
      : await db.all(
          `
          SELECT lr.lobbyist_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM lobbying_records lr
          WHERE lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          GROUP BY lr.lobbyist_name
          `,
        )
    const previousLobbyistCounts = previousYear
      ? await db.all(
          `
          SELECT lr.lobbyist_name AS name, COUNT(DISTINCT lr.id) AS contact_count
          FROM lobbying_records lr
          WHERE substr(TRIM(lr.period), -4) = ? AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          GROUP BY lr.lobbyist_name
          `,
          [previousYear]
        )
      : []

    const biggestMoverOfficials = isAllTime ? [] : biggestMovers(currentOfficialCounts, previousOfficialCounts, "name")
    const biggestMoverLobbyists = isAllTime ? [] : biggestMovers(currentLobbyistCounts, previousLobbyistCounts, "name")

    const topPolicyAreasSelected = yearFilter
      ? await db.all(
          `
          SELECT public_policy_area AS name, COUNT(*) AS return_count
          FROM lobbying_records
          WHERE substr(TRIM(period), -4) = ? AND public_policy_area IS NOT NULL AND TRIM(public_policy_area) != ''
          GROUP BY public_policy_area
          ORDER BY return_count DESC, public_policy_area ASC
          LIMIT 20
          `,
          [yearFilter]
        )
      : await db.all(
          `
          SELECT public_policy_area AS name, COUNT(*) AS return_count
          FROM lobbying_records
          WHERE public_policy_area IS NOT NULL AND TRIM(public_policy_area) != ''
          GROUP BY public_policy_area
          ORDER BY return_count DESC, public_policy_area ASC
          LIMIT 20
          `
        )

    const keywordSourceRows = yearFilter
      ? await db.all(
          `
          SELECT
            COALESCE(subject_matter, '') AS subject_matter,
            COALESCE(intended_results, '') AS intended_results,
            COALESCE(specific_details, '') AS specific_details,
            COALESCE(relevant_matter, '') AS relevant_matter
          FROM lobbying_records
          WHERE substr(TRIM(period), -4) = ?
          `,
          [yearFilter]
        )
      : await db.all(
          `
          SELECT
            COALESCE(subject_matter, '') AS subject_matter,
            COALESCE(intended_results, '') AS intended_results,
            COALESCE(specific_details, '') AS specific_details,
            COALESCE(relevant_matter, '') AS relevant_matter
          FROM lobbying_records
          `
        )

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

    const topKeywordsSelected = Array.from(keywordCounts.entries())
      .map(([token, count]) => ({ token, count }))
      .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token))
      .slice(0, 30)

    const officialCentralitySelected = yearFilter
      ? await db.all(
          `
          WITH edges AS (
            SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
            FROM lobbying_records lr
            JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE substr(TRIM(lr.period), -4) = ?
              AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
              AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          )
          SELECT official AS name, COUNT(DISTINCT lobbyist) AS degree
          FROM edges
          GROUP BY official
          ORDER BY degree DESC, official ASC
          LIMIT 20
          `,
          [yearFilter]
        )
      : await db.all(
          `
          WITH edges AS (
            SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
            FROM lobbying_records lr
            JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
              AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          )
          SELECT official AS name, COUNT(DISTINCT lobbyist) AS degree
          FROM edges
          GROUP BY official
          ORDER BY degree DESC, official ASC
          LIMIT 20
          `
        )

    const lobbyistCentralitySelected = yearFilter
      ? await db.all(
          `
          WITH edges AS (
            SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
            FROM lobbying_records lr
            JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE substr(TRIM(lr.period), -4) = ?
              AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
              AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          )
          SELECT lobbyist AS name, COUNT(DISTINCT official) AS degree
          FROM edges
          GROUP BY lobbyist
          ORDER BY degree DESC, lobbyist ASC
          LIMIT 20
          `,
          [yearFilter]
        )
      : await db.all(
          `
          WITH edges AS (
            SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
            FROM lobbying_records lr
            JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
              AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
          )
          SELECT lobbyist AS name, COUNT(DISTINCT official) AS degree
          FROM edges
          GROUP BY lobbyist
          ORDER BY degree DESC, lobbyist ASC
          LIMIT 20
          `
        )

    const sharedLobbyistsSelected = yearFilter
      ? await db.all(
          `
          WITH edges AS (
            SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
            FROM lobbying_records lr
            JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE substr(TRIM(lr.period), -4) = ?
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
          [yearFilter]
        )
      : await db.all(
          `
          WITH edges AS (
            SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
            FROM lobbying_records lr
            JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
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
          `
        )

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
            ${yearFilter ? "AND substr(TRIM(lr.period), -4) = ?" : ""}
            GROUP BY lr.id
            ORDER BY lr.date_published DESC
            LIMIT 50
            `,
            yearFilter ? [...Array(5).fill(`%${searchTerm}%`), yearFilter] : Array(5).fill(`%${searchTerm}%`)
          )
        : []

    const payload = {
      generated_at: new Date().toISOString(),
      latest_year: latestYear,
      previous_year: previousYear,
      selected_year: isAllTime ? null : selectedYear,
      selected_time_range: isAllTime ? "all" : selectedYear,
      selected_label: isAllTime ? "All time" : selectedYear,
      years: years.map((row) => row.year).filter(Boolean),
      top_targets_selected: topTargetsSelected.map((row) => ({ ...row, slug: slugify(row.name) })),
      top_lobbyists_selected: topLobbyistsSelected.map((row) => ({ ...row, slug: slugify(row.name) })),
      biggest_mover_officials: biggestMoverOfficials,
      biggest_mover_lobbyists: biggestMoverLobbyists,
      top_policy_areas_selected: topPolicyAreasSelected,
      top_keywords_selected: topKeywordsSelected,
      official_centrality_selected: officialCentralitySelected.map((row) => ({ ...row, slug: slugify(row.name) })),
      lobbyist_centrality_selected: lobbyistCentralitySelected.map((row) => ({ ...row, slug: slugify(row.name) })),
      shared_lobbyists_selected: sharedLobbyistsSelected.map((row) => ({
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
    }

    writeCache(cacheKey, payload, 5 * 60 * 1000)
    res.setHeader("X-Data-Cache", "MISS")
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=120")
    res.status(200).json(payload)
  } catch (err) {
    console.error("Error building exploration insights:", err)
    res.status(500).json({
      error: "Internal server error",
      details: err.message
    })
  }
}
