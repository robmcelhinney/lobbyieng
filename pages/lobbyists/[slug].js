import { useRouter } from "next/router"
import Head from "next/head"
import Select from "react-select"
import LobbyingCardLobbyist from "../../components/LobbyingCardLobbyist"
import { useState, useEffect, useMemo } from "react"
import { getServerBaseUrl } from "../../lib/serverBaseUrl"

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
  try {
    const res = await fetch(`${baseUrl}/api/lobbyists/${params.slug}?${toQueryString(query)}`)
    if (!res.ok) {
      return { notFound: true }
    }
    const lobbyistData = await res.json()
    return {
      props: { lobbyistData }
    }
  } catch (err) {
    return {
      props: { lobbyistData: null, fetchError: err.message }
    }
  }
}

export default function LobbyistPage({ lobbyistData, fetchError }) {
  const router = useRouter()
  const {
    name,
    slug,
    records = [],
    total = 0,
    page = 1,
    pageSize = 10,
    officials = [],
    years = [],
    methods = [],
    currentFilters
  } = lobbyistData || {}

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const officialOptions = [{ value: "", label: "All Officials" }, ...officials.map((o) => ({ value: o, label: o }))]
  const currentOfficial =
    officialOptions.find((opt) => opt.value === (currentFilters?.officialFilter || "")) || officialOptions[0]

  const methodOptions = useMemo(() => methods.map((m) => ({ value: m, label: m })), [methods])
  const selectedMethods = useMemo(() => {
    if (Array.isArray(currentFilters?.methodFilter)) {
      return currentFilters.methodFilter
    } else if (typeof currentFilters?.methodFilter === "string" && currentFilters.methodFilter) {
      return [currentFilters.methodFilter]
    }
    return []
  }, [currentFilters?.methodFilter])
  const selectedMethodOptions = useMemo(
    () => methodOptions.filter((opt) => selectedMethods.includes(opt.value)),
    [methodOptions, selectedMethods]
  )
  const [pendingMethods, setPendingMethods] = useState(selectedMethodOptions)
  const [copyStatus, setCopyStatus] = useState("")
  useEffect(() => {
    setPendingMethods(selectedMethodOptions)
  }, [selectedMethodOptions])

  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "rgba(255,255,255,0.85)",
      borderColor: "var(--ui-border)",
      color: "var(--ui-text)"
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "var(--ui-surface)",
      color: "var(--ui-text)",
      zIndex: 9999
    })
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="surface-card text-center">
          <h1 className="text-2xl font-bold mb-2">Error loading lobbyist data</h1>
          <p className="mb-4 text-red-600">{fetchError}</p>
          <button className="px-4 py-2 rounded-md bg-[color:var(--ui-primary)] text-white" onClick={() => router.reload()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!lobbyistData) return <div>Lobbyist not found</div>

  const handleFilterChange = (filterName, value) => {
    let newQuery = { ...router.query, [filterName]: value, page: 1 }
    if (!value || (Array.isArray(value) && value.length === 0)) {
      delete newQuery[filterName]
    }
    if (filterName === "method" && Array.isArray(value)) {
      Object.keys(newQuery).forEach((k) => {
        if (k === "method" || k === "method[]") delete newQuery[k]
      })
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
    if (currentFilters?.officialFilter) params.set("official", currentFilters.officialFilter)
    if (currentFilters?.yearFilter) params.set("year", currentFilters.yearFilter)

    const methodFilter = currentFilters?.methodFilter
    if (Array.isArray(methodFilter)) {
      methodFilter.filter(Boolean).forEach((m) => params.append("method", m))
    } else if (typeof methodFilter === "string" && methodFilter) {
      params.append("method", methodFilter)
    }
    if (Number(page) > 1) params.set("page", String(page))

    const queryString = params.toString()
    return `/lobbyists/${slug}${queryString ? `?${queryString}` : ""}`
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
        <title>{`Lobbyist - ${name}`}</title>
      </Head>
      <div className="min-h-screen">
        <header className="hero-shell">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{name}</h1>
            <p className="hero-subtitle mt-2">
              Total Lobbying Efforts: <span className="font-semibold">{total}</span>
            </p>
            <button
              type="button"
              onClick={copyPermalink}
              className="inline-block mt-4 px-4 py-2 rounded-md border border-white/60 text-white hover:bg-white/10 transition font-semibold text-sm"
            >
              Copy link to this view
            </button>
            {copyStatus ? <p className="text-xs mt-2 text-blue-100">{copyStatus}</p> : null}
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="surface-card mb-6 flex flex-col sm:flex-row gap-6 items-end">
            {/* Official filter */}
            <div className="w-64 accent-blue-600 dark:accent-blue-400">
              <label className="block mb-1 text-sm font-semibold text-muted-ui">Official</label>
              <Select
                options={officialOptions}
                value={currentOfficial}
                onChange={(option) => handleFilterChange("official", option.value)}
                isSearchable
                placeholder="Search officials..."
                styles={selectStyles}
              />
            </div>

            {/* Year filter */}
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

            {/* Method filter */}
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

          <section className="surface-card">
            <h2 className="text-2xl font-semibold mb-4">
              Lobbying Records (Page {page} of {totalPages})
            </h2>
            {records.length > 0 ? (
              <div className="space-y-4">
                {records.map((record) => (
                  <LobbyingCardLobbyist key={record.id} record={record} />
                ))}
              </div>
            ) : (
              <p className="text-muted-ui">No records found.</p>
            )}

            {/* Pagination */}
            <div className="flex flex-wrap items-center gap-2 mt-6">
              {page > 1 && (
                <button onClick={() => handlePageChange(page - 1)} className="px-3 py-1 rounded-md bg-[color:var(--ui-primary)] text-white">
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
                    className={`px-3 py-1 rounded ${
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

              {/* Go to page */}
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
