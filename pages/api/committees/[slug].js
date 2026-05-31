import { getDb } from "../../../lib/sqlite"
import { officialSlugify, slugify } from "../../../lib/slugify"

export default async function handler(req, res) {
  try {
    const { slug } = req.query
    const db = await getDb()

    let committees = []
    try {
      committees = await db.all(`
        SELECT id, name, url, membership_url, house_no, scraped_at
        FROM committees
        ORDER BY name ASC
      `)
    } catch (err) {
      if (String(err?.message || "").includes("no such table")) {
        return res.status(404).json({ error: "Committee data not found" })
      }
      throw err
    }

    const committee = committees.find((row) => slugify(row.name) === slug)
    if (!committee) {
      return res.status(404).json({ error: "Committee not found" })
    }

    const membersRaw = await db.all(
      `
      SELECT DISTINCT
        cm.member_name,
        cm.member_slug,
        cm.member_uri,
        cm.member_url,
        cm.role,
        cm.constituency
      FROM committee_memberships cm
      WHERE cm.committee_id = ?
      ORDER BY
        CASE WHEN cm.role IS NULL OR TRIM(cm.role) = '' THEN 1 ELSE 0 END,
        cm.role ASC,
        cm.member_name ASC
      `,
      [committee.id]
    )
    const officialCounts = await db.all(`
      SELECT dpo.person_name, COUNT(DISTINCT dpo.lobbying_record_id) AS lobbying_return_count
      FROM dpo_entries dpo
      WHERE dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
      GROUP BY dpo.person_name
    `)
    const countBySlug = new Map()
    officialCounts.forEach((row) => {
      const count = Number(row.lobbying_return_count) || 0
      countBySlug.set(slugify(row.person_name), count)
      countBySlug.set(officialSlugify(row.person_name), count)
    })
    const members = membersRaw.map((member) => {
      const profileSlug = member.member_slug || officialSlugify(member.member_name)
      const lobbyingReturnCount = countBySlug.get(profileSlug) || countBySlug.get(slugify(member.member_name)) || 0
      return {
        ...member,
        member_slug: profileSlug,
        has_lobbying_profile: lobbyingReturnCount > 0,
        lobbying_return_count: lobbyingReturnCount
      }
    })

    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=60")
    res.status(200).json({
      ...committee,
      slug: slugify(committee.name),
      members
    })
  } catch (err) {
    console.error("Error in committee detail API:", err)
    res.status(500).json({
      error: "Internal server error",
      details: err.message
    })
  }
}
