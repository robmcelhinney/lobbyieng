import { getDb } from "../../../lib/sqlite"
import { buildCacheKey, readCache, writeCache } from "../../../lib/serverCache"

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
}

function committeeSlugify(name) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

// Helper: extract method from an activity string.
// E.g., "One email to each of the listed TDs. - Email" returns "Email"
function extractMethod(activityStr) {
  if (!activityStr) return ""
  const parts = activityStr.split("-")
  return parts[parts.length - 1].trim()
}

function toIsoOrNull(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export default async function handler(req, res) {
  try {
    const {
      slug,
      page = 1,
      lobbyist,
      year,
      method,
      job_titles,
      per_page = 10,
      official_scope,
      sort = "newest"
    } = req.query
    const officialScopeValue = Array.isArray(official_scope) ? official_scope[0] : official_scope
    const activeOfficialScope = officialScopeValue === "only-this-official" ? "only-this-official" : "all"
    const sortValue = Array.isArray(sort) ? sort[0] : sort
    const allowedSorts = new Set(["newest", "fewest-officials", "most-officials"])
    const activeSort = allowedSorts.has(sortValue) ? sortValue : "newest"
    const cacheKey = buildCacheKey("official-detail-v2", {
      slug,
      page,
      lobbyist,
      year,
      method: Array.isArray(method) ? method.join(",") : method,
      job_titles,
      per_page,
      official_scope: activeOfficialScope,
      sort: activeSort
    })
    const cached = readCache(cacheKey)
    if (cached) {
      res.setHeader("X-Data-Cache", "HIT")
      res.status(200).json(cached)
      return
    }

    let perPageNum = 10
    let returnAll = false
    if (per_page === "All") {
      returnAll = true
    } else {
      perPageNum = parseInt(per_page, 10) || 10
    }
    const offset = (page - 1) * perPageNum

    const db = await getDb()

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
      filterConditions += " AND substr(TRIM(lr.period), -4) = ? "
      filterParams.push(year)
    }
    if (activeOfficialScope === "only-this-official") {
      filterConditions += `
        AND (
          SELECT COUNT(DISTINCT dpo.person_name)
          FROM dpo_entries dpo
          WHERE dpo.lobbying_record_id = lr.id
            AND dpo.person_name IS NOT NULL
            AND TRIM(dpo.person_name) != ''
        ) = 1
      `
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

    const dpoCountSelect = `
        (
          SELECT COUNT(DISTINCT dpo.person_name)
          FROM dpo_entries dpo
          WHERE dpo.lobbying_record_id = lr.id
            AND dpo.person_name IS NOT NULL
            AND TRIM(dpo.person_name) != ''
        ) AS dpo_count,
    `
    const orderClause =
      activeSort === "fewest-officials"
        ? "CASE WHEN dpo_count = 0 THEN 1 ELSE 0 END, dpo_count ASC, lr.date_published DESC"
        : activeSort === "most-officials"
          ? "dpo_count DESC, lr.date_published DESC"
          : "lr.date_published DESC"

    // Define baseQuery for paginated fetch
    const baseQuery = `
      SELECT lr.*,
        ${dpoCountSelect}
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
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `

    // Query paginated records with filters.
    let records = []
    if (returnAll) {
      // Return all records matching filters (no LIMIT/OFFSET)
      const allQuery = `
      SELECT lr.*,
        ${dpoCountSelect}
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
      ORDER BY ${orderClause}
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
      official_count: r.dpo_count || 0,
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

    // Build derived official profile metadata from all matched records.
    const dpoProfileRows = []
    for (const row of allRaw) {
      const date = toIsoOrNull(row.date_published)
      if (!date || typeof row.dpos !== "string") continue
      const dpos = row.dpos.split("||")
      for (const entry of dpos) {
        const [personName, jobTitle, publicBody] = entry.split("|")
        if (personName === canonical) {
          dpoProfileRows.push({
            date_published: date,
            job_title: (jobTitle || "").trim(),
            public_body: (publicBody || "").trim()
          })
        }
      }
    }

    dpoProfileRows.sort((a, b) => new Date(b.date_published) - new Date(a.date_published))
    const mostRecent = dpoProfileRows[0] || null
    const firstSeen = dpoProfileRows.length ? dpoProfileRows[dpoProfileRows.length - 1].date_published : null
    const lastSeen = dpoProfileRows.length ? dpoProfileRows[0].date_published : null
    const distinctTitles = Array.from(new Set(dpoProfileRows.map((r) => r.job_title).filter(Boolean))).sort()
    const distinctBodies = Array.from(new Set(dpoProfileRows.map((r) => r.public_body).filter(Boolean))).sort()
    const officialSlug = slugify(canonical)
    let committeeMemberships = []
    try {
      committeeMemberships = await db.all(
        `
        SELECT DISTINCT
          c.name,
          c.url,
          c.membership_url,
          c.house_no,
          c.scraped_at,
          cm.role,
          cm.member_name,
          cm.member_uri,
          cm.member_url,
          cm.constituency
        FROM committee_memberships cm
        JOIN committees c ON c.id = cm.committee_id
        WHERE cm.member_slug IN (?, ?)
        ORDER BY c.name ASC, cm.role ASC
        `,
        [officialSlug, slug]
      )
    } catch (err) {
      if (!String(err?.message || "").includes("no such table")) {
        throw err
      }
    }

    // Compute unique filter options.
    const uniqueLobbyists = Array.from(new Set(allRecords.map((r) => r.lobbyist_name).filter(Boolean))).sort()
    const uniqueYears = Array.from(
      new Set(allRecords.map((r) => String(r.period || "").trim().slice(-4)).filter((value) => /^\d{4}$/.test(value)))
    ).sort((a, b) => b - a)
    const uniqueMethods = Array.from(
      new Set(allRecords.flatMap((r) => (r.lobbying_activities || []).map(extractMethod)).filter(Boolean))
    ).sort()

    const payload = {
      name: canonical,
      slug: slugify(canonical),
      total,
      page: parseInt(page),
      pageSize: returnAll ? records.length : perPageNum,
      records: parsedRecords,
      profile: {
        name: canonical,
        most_recent_title: mostRecent?.job_title || null,
        most_recent_public_body: mostRecent?.public_body || null,
        first_seen_at: firstSeen,
        last_seen_at: lastSeen,
        distinct_titles: distinctTitles,
        distinct_public_bodies: distinctBodies,
        committee_memberships: committeeMemberships.map((committee) => ({
          ...committee,
          slug: committeeSlugify(committee.name)
        }))
      },
      lobbyists: uniqueLobbyists,
      years: uniqueYears,
      methods: uniqueMethods,
      currentFilters: {
        lobbyistFilter: lobbyist || "",
        yearFilter: year || "",
        methodFilter: method || "",
        officialScope: activeOfficialScope,
        sort: activeSort
      }
    }

    writeCache(cacheKey, payload, 2 * 60 * 1000)
    res.setHeader("X-Data-Cache", "MISS")
    res.status(200).json(payload)
  } catch (err) {
    console.error("Error in official detail API:", err)
    res.status(500).json({ error: "Internal error", details: err.message })
  }
}
