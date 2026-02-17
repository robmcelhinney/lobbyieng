import { useRouter } from "next/router"
import Head from "next/head"
import Select from "react-select"
import LobbyingCard from "../../components/LobbyingCard"
import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { getServerBaseUrl } from "../../lib/serverBaseUrl"

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
function PoliticianImage({ slug, name }) {
  const [imgExists, setImgExists] = useState(true)
  useEffect(() => {
    setImgExists(true)
  }, [slug])
  if (!slug) return null
  const imagePath = `/images/td_thumbnails/${slug}.jpg`
  return imgExists ? (
    <Image
      src={imagePath}
      alt={name}
      className="mx-auto mb-4 rounded shadow max-h-48"
      width={192}
      height={192}
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

  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "rgba(255,255,255,0.85)",
      color: "var(--ui-text)",
      borderColor: "var(--ui-border)"
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "var(--ui-surface)",
      color: "var(--ui-text)",
      zIndex: 9999
    })
  }

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
            <PoliticianImage slug={slug} name={name} />
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
              className="inline-block mt-4 mx-2 px-4 py-2 rounded-md border border-white/60 text-white hover:bg-white/10 transition font-semibold text-sm"
            >
              Copy link to this view
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
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Most Recent Title</div>
                <div className="mt-1 text-sm font-semibold">{profile?.most_recent_title || "Unavailable"}</div>
              </div>
              <div className="kpi-chip">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Most Recent Public Body</div>
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
          </section>

          {/* Filters Bar at Top */}
          <div className="surface-card mb-6 flex flex-col sm:flex-row gap-6 items-end">
            {/* Lobbyist Filter */}
            <div className="w-64 accent-blue-600 dark:accent-blue-400">
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
            <div className="w-32">
              <label className="block mb-1 text-sm font-semibold text-muted-ui">Year</label>
              <select
                value={currentFilters.yearFilter || ""}
                onChange={(e) => handleFilterChange("year", e.target.value)}
                className="w-full border border-[var(--ui-border)] rounded-md px-3 py-2 bg-white/80 dark:bg-slate-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="w-64 accent-blue-600 dark:accent-blue-400">
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
                  <button onClick={() => handlePageChange(1)} className="px-3 py-1 rounded-md bg-[color:var(--ui-primary)] text-white">
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
                <button onClick={() => handlePageChange(page + 1)} className="px-3 py-1 rounded-md bg-[color:var(--ui-primary)] text-white">
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
