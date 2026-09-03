// Single source of truth for URL slugs (mirrored in parser.py).
//
// - `slugify`: strict URL-safe slug for lobbyists and committees.
//   "Roderic O'Gorman" -> "roderic-o-gorman"
// - `officialSlugify`: legacy whitespace-only slug for officials. Kept so
//   existing /officials/* URLs, DB committee_memberships.member_slug values,
//   and roster slugs keep resolving. Note it preserves punctuation:
//   "Roderic O'Gorman" -> "roderic-o'gorman"
// Do NOT use one where the other is expected (explore-page 404s resulted).
export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function officialSlugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
}
