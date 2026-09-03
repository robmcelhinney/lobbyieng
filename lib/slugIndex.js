import { getOrSetCache } from "./serverCache"
import { officialSlugify, slugify } from "./slugify"

const OFFICIAL_INDEX_TTL_MS = 10 * 60 * 1000
const LOBBYIST_INDEX_TTL_MS = 10 * 60 * 1000

// DISTINCT names ordered by first appearance so the canonical pick matches
// the previous row-by-row first-match behaviour.
async function buildIndex(db, query, toSlug) {
  const rows = await db.all(query)
  const map = new Map()
  for (const row of rows) {
    const name = row.name
    if (!name) continue
    const key = toSlug(name)
    if (!map.has(key)) map.set(key, name)
  }
  return map
}

export async function resolveOfficialName(db, slug) {
  const { value: index } = await getOrSetCache("slug-index:officials:v1", OFFICIAL_INDEX_TTL_MS, () =>
    buildIndex(
      db,
      `SELECT person_name AS name, MIN(rowid) AS first_seen
       FROM dpo_entries
       WHERE person_name IS NOT NULL AND TRIM(person_name) != ''
       GROUP BY person_name
       ORDER BY first_seen`,
      officialSlugify
    )
  )
  return index.get(String(slug)) || null
}

export async function resolveLobbyistName(db, slug) {
  const { value: index } = await getOrSetCache("slug-index:lobbyists:v1", LOBBYIST_INDEX_TTL_MS, () =>
    buildIndex(
      db,
      `SELECT lobbyist_name AS name, MIN(rowid) AS first_seen
       FROM lobbying_records
       WHERE lobbyist_name IS NOT NULL AND TRIM(lobbyist_name) != ''
       GROUP BY lobbyist_name
       ORDER BY first_seen`,
      slugify
    )
  )
  return index.get(String(slug)) || null
}
