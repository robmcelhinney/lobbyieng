import { getDb } from "../../../../lib/sqlite"
import { resolveOfficialName } from "../../../../lib/slugIndex"

export default async function handler(req, res) {
  const { slug } = req.query
  if (!slug) {
    res.status(400).json({ error: "Missing slug" })
    return
  }
  try {
    const db = await getDb()
    // Resolve canonical official name via cached slug index (avoids full-table scan).
    const canonical = await resolveOfficialName(db, slug)
    if (!canonical) {
      return res.status(404).json({ error: "Official not found" })
    }
    // Query for unique activities (methods) for this official via dpo_entries
    const methodsRows = await db.all(
      `SELECT lae.activity
             FROM lobbying_activity_entries lae
             JOIN dpo_entries dpo ON lae.lobbying_record_id = dpo.lobbying_record_id
             WHERE dpo.person_name = ?
               AND lae.activity IS NOT NULL
               AND TRIM(lae.activity) != ''`,
      canonical
    )
    // Extract method from activity string (between first and second pipe) and count occurrences
    const methodCounts = {}
    methodsRows.forEach((row) => {
      const parts = row.activity.split("|")
      let method = null
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].trim()) {
          method = parts[i].trim()
          break
        }
      }
      if (method) {
        methodCounts[method] = (methodCounts[method] || 0) + 1
      }
    })
    res.status(200).json({ methods: methodCounts, name: canonical })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
