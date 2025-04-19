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

// Helper: extract method from an activity string.
// E.g., "One email to each of the listed TDs. - Email" returns "Email"
function extractMethod(activityStr) {
  if (!activityStr) return ""
  const parts = activityStr.split("-")
  return parts[parts.length - 1].trim()
}

export default async function handler(req, res) {
  try {
    const { slug, page = 1, lobbyist, year, method, job_titles, per_page = 10 } = req.query

    let perPageNum = 10
    let returnAll = false
    if (per_page === "All") {
      returnAll = true
    } else {
      perPageNum = parseInt(per_page, 10) || 10
    }
    const offset = (page - 1) * perPageNum

    const db = await open({
      filename: "./lobbying.db",
      driver: sqlite3.Database
    })

    // Parse job_titles from comma-separated string to array
    let allowedJobTitles = null
    if (job_titles) {
      allowedJobTitles = job_titles.split(",").map((t) => t.trim())
    }

    // Resolve canonical official name from dpo_entries.
    const dpoRows = await db.all(`SELECT person_name FROM dpo_entries`)
    let canonical = null
    for (const row of dpoRows) {
      if (slugify(row.person_name) === slug) {
        canonical = row.person_name
        break
      }
    }
    if (!canonical) {
      return res.status(404).json({ error: "Official not found" })
    }

    // Build filtering conditions for lobbyist, year, method, and job_title.
    let filterConditions = ""
    const filterParams = []
    if (lobbyist) {
      filterConditions += " AND LOWER(lr.lobbyist_name) = ? "
      filterParams.push(lobbyist.toLowerCase())
    }
    // Accept method as array for multi-select (OR logic)
    let methodFilters = []
    if (Array.isArray(method)) {
      methodFilters = method
    } else if (typeof method === "string" && method) {
      methodFilters = [method]
    }
    if (methodFilters.length > 0) {
      if (typeof method === "string" && method.includes(",")) {
        methodFilters = method.split(",").map((s) => s.trim())
      }
      filterConditions +=
        `\n        AND EXISTS (\n          SELECT 1 FROM lobbying_activity_entries lae\n          WHERE lae.lobbying_record_id = lr.id\n            AND ( ` +
        methodFilters.map(() => `LOWER(lae.activity) LIKE ?`).join(" OR ") +
        ` )\n        )\n      `
      methodFilters.forEach((m) => filterParams.push("%" + m.toLowerCase() + "%"))
    }
    if (year) {
      filterConditions += " AND strftime('%Y', lr.date_published) = ? "
      filterParams.push(year)
    }

    // Add job_title filter if provided
    let jobTitleCondition = ""
    if (allowedJobTitles && allowedJobTitles.length > 0) {
      jobTitleCondition = ` AND dpo.job_title IN (${allowedJobTitles.map(() => "?").join(",")}) `
    }

    // Query total count using the filters.
    const countQuery = `
      SELECT COUNT(DISTINCT lr.id) AS total
      FROM lobbying_records lr
      WHERE EXISTS (
        SELECT 1 FROM dpo_entries dpo
        WHERE dpo.lobbying_record_id = lr.id
          AND dpo.person_name = ?
          ${jobTitleCondition}
      )
      ${filterConditions}
    `
    const countRow = await db.get(countQuery, [canonical, ...(allowedJobTitles || []), ...filterParams])
    const total = countRow?.total || 0

    // Define baseQuery for paginated fetch
    const baseQuery = `
      SELECT lr.*,
        (
          SELECT GROUP_CONCAT(dpo.person_name || '|' || dpo.job_title || '|' || dpo.public_body, '||')
          FROM dpo_entries dpo
          WHERE dpo.lobbying_record_id = lr.id
        ) AS dpos,
        (
          SELECT GROUP_CONCAT(activity, '||')
          FROM lobbying_activity_entries
          WHERE lobbying_record_id = lr.id
        ) AS activities
      FROM lobbying_records lr
      WHERE EXISTS (
        SELECT 1 FROM dpo_entries dpo
        WHERE dpo.lobbying_record_id = lr.id
          AND dpo.person_name = ?
          ${jobTitleCondition}
      )
      ${filterConditions}
      ORDER BY lr.date_published DESC
      LIMIT ? OFFSET ?
    `

    // Query paginated records with filters.
    let records = []
    if (returnAll) {
      // Return all records matching filters (no LIMIT/OFFSET)
      const allQuery = `
      SELECT lr.*,
        (
          SELECT GROUP_CONCAT(dpo.person_name || '|' || dpo.job_title || '|' || dpo.public_body, '||')
          FROM dpo_entries dpo
          WHERE dpo.lobbying_record_id = lr.id
        ) AS dpos,
        (
          SELECT GROUP_CONCAT(activity, '||')
          FROM lobbying_activity_entries
          WHERE lobbying_record_id = lr.id
        ) AS activities
      FROM lobbying_records lr
      WHERE EXISTS (
        SELECT 1 FROM dpo_entries dpo
        WHERE dpo.lobbying_record_id = lr.id
          AND dpo.person_name = ?
          ${jobTitleCondition}
      )
      ${filterConditions}
      ORDER BY lr.date_published DESC
    `
      records = await db.all(allQuery, [canonical, ...(allowedJobTitles || []), ...filterParams])
    } else {
      records = await db.all(baseQuery, [canonical, ...(allowedJobTitles || []), ...filterParams, perPageNum, offset])
    }
    const parsedRecords = records.map((r) => ({
      id: r.id,
      url: r.url,
      lobbyist_name: r.lobbyist_name,
      date_published: r.date_published,
      specific_details: r.specific_details?.slice(0, 1000),
      intended_results: r.intended_results?.slice(0, 1000),
      // new fields
      any_dpo_or_former_dpo: r.any_dpo_or_former_dpo,
      isFormerDPO: r.any_dpo_or_former_dpo === "Yes",
      dpo_entries:
        typeof r.dpos === "string"
          ? r.dpos.split("||").map((entry) => {
              const [name, job, body] = entry.split("|")
              return {
                person_name: name,
                job_title: job,
                public_body: body
              }
            })
          : [],
      lobbying_activities:
        typeof r.activities === "string"
          ? r.activities
              .split("||")
              .map((entry) => {
                const parts = entry.split("|").map((s) => s.trim())
                return parts.length >= 2 && parts[0] ? `${parts[0]} - ${parts[1]}` : parts[1] || parts[0] || ""
              })
              .filter(Boolean)
          : []
    }))

    // Retrieve all records (unpaginated) to compute unique filter options.
    const allRecordsQuery = `
      SELECT lr.*,
        (
          SELECT GROUP_CONCAT(dpo.person_name || '|' || dpo.job_title || '|' || dpo.public_body, '||')
          FROM dpo_entries dpo
          WHERE dpo.lobbying_record_id = lr.id
        ) AS dpos,
        (
          SELECT GROUP_CONCAT(activity, '||')
          FROM lobbying_activity_entries
          WHERE lobbying_record_id = lr.id
        ) AS activities
      FROM lobbying_records lr
      WHERE EXISTS (
        SELECT 1 FROM dpo_entries dpo
        WHERE dpo.lobbying_record_id = lr.id
          AND dpo.person_name = ?
      )
      ORDER BY lr.date_published DESC
    `
    const allRaw = await db.all(allRecordsQuery, [canonical])
    const allRecords = allRaw.map((r) => ({
      id: r.id,
      url: r.url,
      lobbyist_name: r.lobbyist_name,
      date_published: r.date_published,
      specific_details: r.specific_details?.slice(0, 1000),
      intended_results: r.intended_results?.slice(0, 1000),
      dpo_entries:
        typeof r.dpos === "string"
          ? r.dpos.split("||").map((entry) => {
              const [name, job, body] = entry.split("|")
              return {
                person_name: name,
                job_title: job,
                public_body: body
              }
            })
          : [],
      lobbying_activities:
        typeof r.activities === "string"
          ? r.activities
              .split("||")
              .map((entry) => {
                const parts = entry.split("|").map((s) => s.trim())
                return parts.length >= 2 && parts[0] ? `${parts[0]} - ${parts[1]}` : parts[1] || parts[0] || ""
              })
              .filter(Boolean)
          : []
    }))

    // Compute unique filter options.
    const uniqueLobbyists = Array.from(new Set(allRecords.map((r) => r.lobbyist_name).filter(Boolean))).sort()
    const uniqueYears = Array.from(
      new Set(allRecords.map((r) => new Date(r.date_published).getFullYear().toString()).filter(Boolean))
    ).sort((a, b) => b - a)
    const uniqueMethods = Array.from(
      new Set(allRecords.flatMap((r) => (r.lobbying_activities || []).map(extractMethod)).filter(Boolean))
    ).sort()

    res.status(200).json({
      name: canonical,
      slug: slugify(canonical),
      total,
      page: parseInt(page),
      pageSize: returnAll ? records.length : perPageNum,
      records: parsedRecords,
      lobbyists: uniqueLobbyists,
      years: uniqueYears,
      methods: uniqueMethods,
      currentFilters: {
        lobbyistFilter: lobbyist || "",
        yearFilter: year || "",
        methodFilter: method || ""
      }
    })
  } catch (err) {
    console.error("Error in official detail API:", err)
    res.status(500).json({ error: "Internal error", details: err.message })
  }
}
