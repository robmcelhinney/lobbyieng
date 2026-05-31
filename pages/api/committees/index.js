import { getDb } from "../../../lib/sqlite"
import { slugify } from "../../../lib/slugify"

export default async function handler(req, res) {
  try {
    const db = await getDb()
    let rows = []
    try {
      rows = await db.all(`
        SELECT
          c.id,
          c.name,
          c.url,
          c.membership_url,
          c.house_no,
          c.scraped_at,
          COUNT(cm.id) AS member_count,
          SUM(CASE WHEN cm.member_uri LIKE '%.D.%' THEN 1 ELSE 0 END) AS dail_member_count,
          SUM(CASE WHEN cm.member_uri LIKE '%.S.%' THEN 1 ELSE 0 END) AS seanad_member_count
        FROM committees c
        LEFT JOIN committee_memberships cm ON cm.committee_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC
      `)
    } catch (err) {
      if (!String(err?.message || "").includes("no such table")) throw err
    }

    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=60")
    res.status(200).json(
      rows.map((row) => {
        const dailMemberCount = Number(row.dail_member_count) || 0
        const seanadMemberCount = Number(row.seanad_member_count) || 0
        const lowerName = String(row.name || "").toLowerCase()
        const chamberType = lowerName.includes("seanad")
          ? "seanad"
          : lowerName.includes("dáil") || lowerName.includes("dail")
            ? "dail"
            : dailMemberCount > 0 && seanadMemberCount > 0
              ? "joint"
              : seanadMemberCount > 0
                ? "seanad"
                : dailMemberCount > 0
                  ? "dail"
                  : "unknown"
        return {
          ...row,
          dail_member_count: dailMemberCount,
          seanad_member_count: seanadMemberCount,
          chamber_type: chamberType,
          slug: slugify(row.name)
        }
      })
    )
  } catch (err) {
    console.error("Error in committees API:", err)
    res.status(500).json({
      error: "Internal server error",
      details: err.message
    })
  }
}
