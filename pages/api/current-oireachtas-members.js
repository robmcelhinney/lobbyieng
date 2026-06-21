import { loadCurrentOireachtasRosterByChamber } from "../../lib/oireachtasRoster"

export default async function handler(req, res) {
  try {
    const chamber = req.query.chamber === "seanad" ? "seanad" : req.query.chamber === "dail" ? "dail" : "all"
    const roster = await loadCurrentOireachtasRosterByChamber(chamber)
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=60")
    res.status(200).json(roster)
  } catch (err) {
    res.status(500).json({
      error: "Failed to load current Oireachtas members",
      details: err.message
    })
  }
}
