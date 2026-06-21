import { execFileSync } from "child_process"
import fs from "fs/promises"
import path from "path"

const ROSTER_PATH = path.join(process.cwd(), "data", "derived", "current_oireachtas_members.json")

export async function loadCurrentOireachtasRoster() {
  try {
    const raw = await fs.readFile(ROSTER_PATH, "utf-8")
    const roster = JSON.parse(raw)
    return Array.isArray(roster) ? roster : []
  } catch {
    return []
  }
}

export async function loadCurrentOireachtasRosterByChamber(chamber) {
  const roster = await loadCurrentOireachtasRoster()
  if (!chamber || chamber === "all") return roster
  return roster.filter((member) => member?.chamber === chamber)
}

export function rosterNameSet(roster) {
  return new Set(
    (Array.isArray(roster) ? roster : [])
      .map((member) => member?.slug || member?.name || "")
      .filter(Boolean)
  )
}

export function fetchOireachtasMemberContacts(memberUrl) {
  if (!memberUrl) {
    return {
      emails: [],
      phones: [],
      social_links: []
    }
  }

  let html = ""
  try {
    html = execFileSync("curl", ["-L", "-s", "--max-time", "20", memberUrl], { encoding: "utf-8" })
  } catch {
    return {
      emails: [],
      phones: [],
      social_links: []
    }
  }

  const emails = Array.from(new Set(Array.from(html.matchAll(/href="mailto:([^"]+)"/gi), (match) => match[1]))).sort()

  const socialLinks = []
  const socialPattern = /<li class="c-member-about__web-item">.*?<img[^>]+alt="([^"]+)".*?<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gis
  for (const match of html.matchAll(socialPattern)) {
    const label = match[1]?.trim()
    const url = match[2]?.trim()
    const text = match[3]?.replace(/\s+/g, " ").trim()
    if (url) {
      socialLinks.push({
        label,
        text: text || label,
        url
      })
    }
  }

  const phones = []
  const phoneBlock = html.match(/<ul class="c-member-about__phone-numbers">(.*?)<\/ul>/is)
  if (phoneBlock) {
    const phonePattern = /<li class="c-member-about__phone">.*?<p[^>]*>(.*?)<\/p>/gis
    for (const match of phoneBlock[1].matchAll(phonePattern)) {
      const text = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      if (text) {
        phones.push(text)
      }
    }
  }

  return {
    emails,
    phones,
    social_links: socialLinks
  }
}
