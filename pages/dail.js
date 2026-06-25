import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Select from "react-select"
import Head from "next/head"
import { getServerBaseUrl } from "../lib/serverBaseUrl"
import { selectStyles } from "../lib/selectStyles"

const dailOfficialTitles = [
  "TD",
  "An Tánaiste",
  "An Taoiseach",
  "Minister",
  "Minister of State",
  "Tánaiste and Minister"
]

export const senatorOfficialTitles = ["Senator"]

function normalizeOfficials(rows) {
  return rows
    .map((row) => ({
      ...row,
      returnCount: Number(row?.return_count ?? row?.returnCount ?? 0) || 0
    }))
    .filter((row) => row.name && row.slug)
}

const API_CACHE_BUSTER = "3"

export async function getOfficialsPageProps(context, officialTitles = dailOfficialTitles, chamber = "dail") {
  const baseUrl = getServerBaseUrl(context.req)
  try {
    const yearsRes = await fetch(`${baseUrl}/api/years`)
    const yearsJson = yearsRes.ok ? await yearsRes.json() : { years: [], latestYear: "" }
    const years = yearsJson.years || []
    const latestYear = yearsJson.latestYear || years.at(-1) || ""
    const rosterRes = await fetch(`${baseUrl}/api/current-oireachtas-members?chamber=${encodeURIComponent(chamber)}`)
    const currentRoster = rosterRes.ok ? await rosterRes.json() : []
    const currentRosterSlugs = Array.from(
      new Set((Array.isArray(currentRoster) ? currentRoster : []).map((member) => member?.slug).filter(Boolean))
    )

    const jobTitlesParam = officialTitles.join(",")
    const res = await fetch(
      `${baseUrl}/api/officials?year=${encodeURIComponent(
        latestYear
      )}&job_titles=${encodeURIComponent(jobTitlesParam)}&v=${API_CACHE_BUSTER}`
    )
    if (!res.ok) throw new Error("API failed")
    const officials = normalizeOfficials(await res.json())
    return { props: { officials, years, latestYear, currentRosterSlugs } }
  } catch (err) {
    console.error("Error fetching officials or periods:", err)
    return { props: { officials: [], years: [], latestYear: "", currentRosterSlugs: [] } }
  }
}

export async function getServerSideProps(context) {
  return getOfficialsPageProps(context)
}

function dedupedOfficials(array) {
  return Array.from(new Map(array.map((item) => [item.slug, item])).values())
}

export default function Index({ officials: initialOfficials, years, latestYear, currentRosterSlugs, directory = "dail" }) {
  const isSenatorsDirectory = directory === "senators"
  const officialTitles = isSenatorsDirectory ? senatorOfficialTitles : dailOfficialTitles
  const pageTitle = isSenatorsDirectory ? "Senators" : "Dáil"
  const heading = isSenatorsDirectory ? "Find a Senator" : "Find a TD"
  const description = isSenatorsDirectory
    ? "Search and explore Irish Senators and lobbying activity. Filter by year and name."
    : "Search and explore Irish Dáil members and lobbying activity. Filter by year and name."
  const canonicalPath = isSenatorsDirectory ? "/senators" : "/dail"
  const [selectedYear, setSelectedYear] = useState(latestYear)
  const [selectedName, setSelectedName] = useState(null)
  const [sortBy, setSortBy] = useState("name")
  const [officials, setOfficials] = useState(normalizeOfficials(initialOfficials))
  const [currentOnly, setCurrentOnly] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const rosterSlugSet = useMemo(() => new Set(currentRosterSlugs || []), [currentRosterSlugs])
  const hasRosterFilter = rosterSlugSet.size > 0

  useEffect(() => {
    setIsLoading(true)
    const jobTitlesParam = officialTitles.join(",")
    const url = selectedYear
      ? `/api/officials?year=${encodeURIComponent(selectedYear)}&job_titles=${encodeURIComponent(jobTitlesParam)}&v=${API_CACHE_BUSTER}`
      : `/api/officials?period=All&job_titles=${encodeURIComponent(jobTitlesParam)}&v=${API_CACHE_BUSTER}`
    fetch(url)
      .then((res) => res.json())
      .then((data) => setOfficials(normalizeOfficials(data)))
      .finally(() => setIsLoading(false))
  }, [officialTitles, selectedYear])

  const visibleOfficials =
    currentOnly && hasRosterFilter ? officials.filter((official) => rosterSlugSet.has(official.slug)) : officials
  const filtered = visibleOfficials.filter((o) => {
    return selectedName ? o.name === selectedName.value : true
  })
  const deduped = dedupedOfficials(filtered)
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "returns-desc", label: "Most returns" },
    { value: "returns-asc", label: "Fewest returns" }
  ]
  const nameOptions = [...deduped].sort((a, b) => a.name.localeCompare(b.name)).map((o) => ({ value: o.name, label: o.name }))
  const sortedDeduped = [...deduped].sort((a, b) => {
    if (sortBy === "returns-desc") {
      if (b.returnCount !== a.returnCount) return b.returnCount - a.returnCount
      return a.name.localeCompare(b.name)
    }
    if (sortBy === "returns-asc") {
      if (a.returnCount !== b.returnCount) return a.returnCount - b.returnCount
      return a.name.localeCompare(b.name)
    }
    return a.name.localeCompare(b.name)
  })

  return (
    <>
      <Head>
        <title>Lobbyieng - {pageTitle}</title>
        <meta
          name="description"
          content={description}
        />
        <meta property="og:title" content={`Lobbyieng - ${pageTitle}`} />
        <meta
          property="og:description"
          content={description}
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://lobbyieng.com${canonicalPath}`} />
        <meta property="og:image" content="/android-chrome-512x512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Lobbyieng - ${pageTitle}`} />
        <meta
          name="twitter:description"
          content={description}
        />
        <meta name="twitter:image" content="/android-chrome-512x512.png" />
      </Head>
      <div className="min-h-screen">
        {isLoading && (
          <div className="w-full h-1 bg-blue-200 dark:bg-blue-900">
            <div className="h-1 bg-blue-600 dark:bg-blue-400 animate-pulse w-full"></div>
          </div>
        )}

        <header className="hero-shell">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{heading}</h1>
            <p className="hero-subtitle mt-2">Search elected officials and inspect their recent lobbying activity.</p>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="surface-card mb-6 flex flex-col sm:flex-row gap-6 items-end">
            <div className="w-50">
              <label className="block mb-1 text-sm font-semibold text-muted-ui">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="native-select w-full border border-[var(--ui-border)] rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-64 accent-blue-600 dark:accent-blue-400">
              <label className="block text-sm font-semibold text-muted-ui mb-1">Name</label>
              <Select
                options={nameOptions}
                value={selectedName}
                onChange={setSelectedName}
                isClearable
                placeholder="Search by name..."
                styles={selectStyles}
              />
            </div>

            <div className="w-40">
              <label className="block mb-1 text-sm font-semibold text-muted-ui">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="native-select w-full border border-[var(--ui-border)] rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-muted-ui pb-2">
              <input
                type="checkbox"
                checked={currentOnly}
                onChange={(e) => setCurrentOnly(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--ui-border)] accent-blue-600 dark:accent-blue-400"
              />
              Current {isSenatorsDirectory ? "Senators" : "TDs"} only
            </label>

            {(selectedYear || selectedName) && (
              <div>
                <button
                  onClick={() => {
                    setSelectedYear("")
                    setSelectedName(null)
                  }}
                  className="text-sm font-semibold text-[color:var(--ui-primary)] hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          <section className="surface-card">
            <h2 className="text-2xl font-semibold mb-4">Officials ({isLoading ? "..." : sortedDeduped.length} results)</h2>
            {isLoading ? (
              <div className="text-center text-blue-600 dark:text-blue-300 py-8">Loading officials...</div>
            ) : sortedDeduped.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {sortedDeduped.map((official) => (
                  <li key={official.slug}>
                    <Link
                      href={`/officials/${official.slug}`}
                      className="surface-card card-interactive no-underline block min-h-[120px]"
                    >
                      <h3 className="font-bold">{official.name}</h3>
                      <p className="text-sm text-muted-ui mt-1">{official.job_title}</p>
                      <p className="mt-2 text-sm text-muted-ui">
                        {official.returnCount} return{official.returnCount === 1 ? "" : "s"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-ui">No results found.</p>
            )}
          </section>
        </main>
      </div>
    </>
  )
}
