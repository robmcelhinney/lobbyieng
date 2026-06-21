import { useRouter } from "next/router"
import Head from "next/head"
import Image from "next/image"
import Select from "react-select"
import LobbyingCard from "../../components/LobbyingCard"
import { useState, useEffect, useMemo } from "react"
import { Share2 } from "lucide-react"
import { getServerBaseUrl } from "../../lib/serverBaseUrl"
import { selectStyles } from "../../lib/selectStyles"
import Link from "next/link"

function formatDate(value) {
  if (!value) return "Unavailable"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unavailable"
  return date.toLocaleDateString("en-IE", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })
}

function toQueryString(query) {
  const params = []
  for (const key in query) {
    const value = query[key]
    if (Array.isArray(value)) {
      value.forEach((v) => params.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`))
    } else if (value !== undefined) {
      params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }
  return params.join("&")
}

export async function getServerSideProps({ params, query, req }) {
  const baseUrl = getServerBaseUrl(req)
  if (!params || !params.slug) {
    return { notFound: true }
  }
  const res = await fetch(`${baseUrl}/api/officials/${params.slug}?${toQueryString(query)}`)
  if (!res.ok) {
    return { notFound: true }
  }
  const officialData = await res.json()
  return {
    props: { officialData }
  }
}

// Politician image component to handle image existence check
function PoliticianImage({ slug, name, directory = "td_thumbnails" }) {
  const [imgExists, setImgExists] = useState(true)
  useEffect(() => {
    setImgExists(true)
  }, [directory, slug])
  if (!slug) return null
  const imagePath = `/images/${directory}/${slug}.jpg`
  return imgExists ? (
    <Image
      src={imagePath}
      alt={name}
      width={224}
      height={224}
      className="mx-auto mb-4 rounded shadow max-h-56 w-auto h-auto object-contain"
      onError={() => setImgExists(false)}
    />
  ) : null
}

export default function OfficialPage({ officialData }) {
  // Move all hooks to the top level, before any return or conditional
  const router = useRouter()
  // Default to empty object to avoid conditional hooks
  const safeOfficialData = officialData || {}
  const {
    name,
    slug,
    records = [],
    total = 0,
    page = 1,
    pageSize = 10,
    profile = null,
    lobbyists = [],
    years = [],
    methods = [],
    currentFilters = {}
  } = safeOfficialData

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const lobbyistOptions = [{ value: "", label: "All Lobbyists" }, ...lobbyists.map((l) => ({ value: l, label: l }))]
  const currentLobbyist =
    lobbyistOptions.find((opt) => opt.value === currentFilters.lobbyistFilter) || lobbyistOptions[0]
  const officialScopeOptions = [
    { value: "all", label: "All records" },
    { value: "only-this-official", label: "Only this official" }
  ]
  const sortOptions = [
    { value: "newest", label: "Newest first" },
    { value: "fewest-officials", label: "Fewest officials first" },
    { value: "most-officials", label: "Most officials first" }
  ]

  const methodOptions = useMemo(() => methods.map((m) => ({ value: m, label: m })), [methods])
  const selectedMethods = useMemo(() => {
    if (Array.isArray(currentFilters.methodFilter)) {
      return currentFilters.methodFilter
    } else if (typeof currentFilters.methodFilter === "string" && currentFilters.methodFilter) {
      return [currentFilters.methodFilter]
    }
    return []
  }, [currentFilters.methodFilter])
  const selectedMethodOptions = useMemo(
    () => methodOptions.filter((opt) => selectedMethods.includes(opt.value)),
    [methodOptions, selectedMethods]
  )
  const [pendingMethods, setPendingMethods] = useState(selectedMethodOptions)
  const [copyStatus, setCopyStatus] = useState("")
  useEffect(() => {
    setPendingMethods(selectedMethodOptions)
  }, [selectedMethodOptions])

  if (!officialData) return <div>Official not found</div>

  const handleFilterChange = (filterName, value) => {
    let newQuery = { ...router.query, [filterName]: value, page: 1 }
    if (!value || (Array.isArray(value) && value.length === 0)) {
      delete newQuery[filterName]
    }
    // Special handling for method multi-select: flatten to multiple 'method' keys
    if (filterName === "method" && Array.isArray(value)) {
      // Remove any method or method[] keys
      Object.keys(newQuery).forEach((k) => {
        if (k === "method" || k === "method[]") delete newQuery[k]
      })
      // Next.js router supports passing arrays for repeated query params
      newQuery.method = value
    }
    router.push({ pathname: router.pathname, query: newQuery })
  }

  const handlePageChange = (newPage) => {
    router.push({
      pathname: router.pathname,
      query: { ...router.query, page: newPage }
    })
  }

  const buildPermalinkPath = () => {
    const params = new URLSearchParams()
    if (currentFilters.lobbyistFilter) params.set("lobbyist", currentFilters.lobbyistFilter)
    if (currentFilters.yearFilter) params.set("year", currentFilters.yearFilter)
    if (currentFilters.officialScope === "only-this-official") {
      params.set("official_scope", currentFilters.officialScope)
    }
    if (currentFilters.sort && currentFilters.sort !== "newest") params.set("sort", currentFilters.sort)

    const methodFilter = currentFilters.methodFilter
    if (Array.isArray(methodFilter)) {
      methodFilter.filter(Boolean).forEach((m) => params.append("method", m))
    } else if (typeof methodFilter === "string" && methodFilter) {
      params.append("method", methodFilter)
    }
    if (Number(page) > 1) params.set("page", String(page))

    const queryString = params.toString()
    return `/officials/${slug}${queryString ? `?${queryString}` : ""}`
  }

  const copyPermalink = async () => {
    if (typeof window === "undefined") return
    const href = `${window.location.origin}${buildPermalinkPath()}`
    try {
      await navigator.clipboard.writeText(href)
      setCopyStatus("Link copied")
    } catch {
      setCopyStatus("Copy failed")
    }
    setTimeout(() => setCopyStatus(""), 1600)
  }

  return (
    <>
      <Head>
        <title>{`Official - ${name}`}</title>
      </Head>
      <div className="min-h-screen">
        {/* Header */}
        <header className="hero-shell">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center">
            {/* Politician Image if available */}
            <PoliticianImage
              slug={slug}
              name={name}
              directory={profile?.most_recent_title === "Senator" ? "senator_thumbnails" : "td_thumbnails"}
            />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{name}</h1>
            <p className="hero-subtitle mt-2">
              Total lobbying returns involving this official: <span className="font-semibold">{total}</span>
            </p>
            {/* Link to Connections Graph */}
            <a
              href={`/connections/${slug}`}
              className="inline-block mt-4 mx-2 px-4 py-2 rounded-md bg-[color:var(--ui-accent)] text-white hover:opacity-90 transition no-underline font-semibold text-sm"
            >
              Connections Graph
            </a>
            <a
              href={`/methods/${slug}`}
              className="inline-block mt-4 mx-2 px-4 py-2 rounded-md bg-white/90 text-slate-900 hover:bg-white transition no-underline font-semibold text-sm"
            >
              Method Pie
            </a>
            <button
              type="button"
              onClick={copyPermalink}
              aria-label="Share this view"
              className="inline-flex items-center gap-2 mt-4 mx-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white/15 hover:border-white/30"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </button>
            {copyStatus ? <p className="text-xs mt-2 text-blue-100">{copyStatus}</p> : null}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <section className="surface-card mb-6">
            <h2 className="text-xl font-semibold mb-3">Official Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="kpi-chip">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Most Recent Title
                </div>
                <div className="mt-1 text-sm font-semibold">{profile?.most_recent_title || "Unavailable"}</div>
              </div>
              <div className="kpi-chip">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Most Recent Public Body
                </div>
                <div className="mt-1 text-sm font-semibold">{profile?.most_recent_public_body || "Unavailable"}</div>
              </div>
              <div className="kpi-chip">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">First Seen</div>
                <div className="mt-1 text-sm font-semibold">{formatDate(profile?.first_seen_at)}</div>
              </div>
              <div className="kpi-chip">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Last Seen</div>
                <div className="mt-1 text-sm font-semibold">{formatDate(profile?.last_seen_at)}</div>
              </div>
            </div>

            {profile?.oireachtas_profile ? (
              <div className="mt-4">
                <div className="rounded-lg border border-[var(--ui-border)] bg-white/70 dark:bg-slate-900/20 p-4">
                  <h3 className="text-sm font-semibold mb-2">Oireachtas Profile</h3>
                  <div className="space-y-3 text-sm">
                    {profile.oireachtas_profile.member_url ? (
                      <a
                        href={profile.oireachtas_profile.member_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex font-medium text-[color:var(--ui-primary)] hover:underline"
                      >
                        View on oireachtas.ie
                      </a>
                    ) : null}

                    {(profile.oireachtas_profile.emails?.length ||
                      profile.oireachtas_profile.phones?.length ||
                      profile.oireachtas_profile.social_links?.length) ? (
                      <div className="pt-2 border-t border-[var(--ui-border)] space-y-3">
                        {profile.oireachtas_profile.emails?.length ? (
                          <div>
                            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300 mb-1">
                              Email
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {profile.oireachtas_profile.emails.map((email) => (
                                <a
                                  key={email}
                                  href={`mailto:${email}`}
                                  className="rounded-full border border-[var(--ui-border)] bg-white/80 dark:bg-slate-900/35 px-2.5 py-1 hover:underline"
                                >
                                  {email}
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {profile.oireachtas_profile.phones?.length ? (
                          <div>
                            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300 mb-1">
                              Phone
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {profile.oireachtas_profile.phones.map((phone) => (
                                <span
                                  key={phone}
                                  className="rounded-full border border-[var(--ui-border)] bg-white/80 dark:bg-slate-900/35 px-2.5 py-1"
                                >
                                  {phone}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {profile.oireachtas_profile.social_links?.length ? (
                          <div>
                            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300 mb-1">
                              Socials
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {profile.oireachtas_profile.social_links.map((social) => (
                                <a
                                  key={`${social.label}-${social.url}`}
                                  href={social.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full border border-[var(--ui-border)] bg-white/80 dark:bg-slate-900/35 px-2.5 py-1 hover:underline"
                                >
                                  {social.label || social.text || social.url}
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Observed Titles</h3>
                {profile?.distinct_titles?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.distinct_titles.map((title) => (
                      <span
                        key={title}
                        className="text-xs md:text-sm px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-white/80 dark:bg-slate-900/35"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-ui">No titles available.</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Observed Public Bodies</h3>
                {profile?.distinct_public_bodies?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.distinct_public_bodies.map((body) => (
                      <span
                        key={body}
                        className="text-xs md:text-sm px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-white/80 dark:bg-slate-900/35"
                      >
                        {body}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-ui">No public bodies available.</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold">Current Oireachtas Committee Memberships</h3>
                {profile?.committee_memberships?.[0]?.scraped_at ? (
                  <span className="text-xs text-muted-ui">
                    Updated {formatDate(profile.committee_memberships[0].scraped_at)}
                  </span>
                ) : null}
              </div>
              {profile?.committee_memberships?.length ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {profile.committee_memberships.map((committee) => (
                      <Link
                        key={`${committee.url}-${committee.role || "member"}`}
                        href={`/committees/${committee.slug}`}
                        className="text-xs md:text-sm px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-white/80 dark:bg-slate-900/35 hover:underline no-underline"
                      >
                        {committee.name}
                        {committee.role ? ` - ${committee.role}` : ""}
                      </Link>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-ui">
                    Current memberships may indicate policy relevance. They do not prove why a lobbying contact was
                    made, and may not match membership at the time of older returns.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-ui">No current committee memberships matched for this official.</p>
              )}
            </div>
          </section>

          {/* Filters Bar at Top */}
          <div className="surface-card mb-6 flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            {/* Lobbyist Filter */}
            <div className="w-full sm:w-64 accent-blue-600 dark:accent-blue-400">
              <label className="block mb-1 text-sm font-semibold text-muted-ui">Lobbyist</label>
              <Select
                options={lobbyistOptions}
                value={currentLobbyist}
                onChange={(option) => handleFilterChange("lobbyist", option.value)}
                isSearchable
                placeholder="Search lobbyists..."
                styles={selectStyles}
              />
            </div>

            {/* Year Filter */}
            <div className="w-full sm:w-32">
              <label className="block mb-1 text-sm font-semibold text-muted-ui">Year</label>
              <select
                value={currentFilters.yearFilter || ""}
                onChange={(e) => handleFilterChange("year", e.target.value)}
                className="native-select w-full border border-[var(--ui-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Years</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Method Filter (multi-select, Grafana style: only update on close) */}
            <div className="w-full sm:w-64 accent-blue-600 dark:accent-blue-400">
              <label className="block mb-1 text-sm font-semibold text-muted-ui">Method</label>
              <Select
                options={methodOptions}
                value={pendingMethods}
                onChange={setPendingMethods}
                isMulti
                isClearable
                closeMenuOnSelect={false}
                menuPlacement="auto"
                placeholder="Select methods..."
                styles={selectStyles}
                menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                onMenuOpen={() => setPendingMethods(selectedMethodOptions)}
                onMenuClose={() => {
                  handleFilterChange(
                    "method",
                    pendingMethods.map((o) => o.value)
                  )
                }}
              />
            </div>

            <div className="w-full sm:w-48">
              <label className="block mb-1 text-sm font-semibold text-muted-ui">Official Scope</label>
              <select
                value={currentFilters.officialScope || "all"}
                onChange={(e) => handleFilterChange("official_scope", e.target.value)}
                className="native-select w-full border border-[var(--ui-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {officialScopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-56">
              <label className="block mb-1 text-sm font-semibold text-muted-ui">Sort</label>
              <select
                value={currentFilters.sort || "newest"}
                onChange={(e) => handleFilterChange("sort", e.target.value)}
                className="native-select w-full border border-[var(--ui-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lobbying Records Section */}
          <section className="surface-card">
            <h2 className="text-2xl font-semibold mb-4">
              Lobbying Records (Page {page} of {totalPages})
            </h2>
            {records.length > 0 ? (
              <div className="space-y-4">
                {records.map((record) => (
                  <LobbyingCard key={record.id} record={record} />
                ))}
              </div>
            ) : (
              <p className="text-muted-ui">No records found.</p>
            )}

            {/* Pagination */}
            <div className="flex flex-wrap items-center gap-2 mt-6">
              {page > 1 && (
                <button
                  onClick={() => handlePageChange(page - 1)}
                  className="px-3 py-1 rounded-md bg-[color:var(--ui-primary)] text-white"
                >
                  ← Prev
                </button>
              )}
              {page > 3 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="px-3 py-1 rounded-md bg-[color:var(--ui-primary)] text-white"
                  >
                    1
                  </button>
                  {page > 4 && <span className="px-2">…</span>}
                </>
              )}
              {[...Array(5)].map((_, i) => {
                const p = page - 2 + i
                if (p < 1 || p > totalPages) return null
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`px-3 py-1 rounded-md ${
                      p === page ? "bg-blue-800 font-bold text-white" : "bg-[color:var(--ui-primary)] text-white"
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              {page < totalPages - 2 && (
                <>
                  {page < totalPages - 3 && <span className="px-2">…</span>}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="px-3 py-1 rounded-md bg-[color:var(--ui-primary)] text-white"
                  >
                    {totalPages}
                  </button>
                </>
              )}
              {page < totalPages && (
                <button
                  onClick={() => handlePageChange(page + 1)}
                  className="px-3 py-1 rounded-md bg-[color:var(--ui-primary)] text-white"
                >
                  Next →
                </button>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const targetPage = parseInt(e.target.page.value)
                  if (targetPage >= 1 && targetPage <= totalPages && targetPage !== page) {
                    handlePageChange(targetPage)
                  }
                }}
                className="flex items-center ml-4"
              >
                <label className="mr-2">Go to page:</label>
                <input
                  type="number"
                  name="page"
                  min="1"
                  max={totalPages}
                  defaultValue={page}
                  className="w-16 border border-[var(--ui-border)] rounded-md px-2 py-1 bg-white/80 dark:bg-slate-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="ml-2 px-3 py-1 rounded-md bg-[color:var(--ui-primary)] text-white">
                  Go
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
