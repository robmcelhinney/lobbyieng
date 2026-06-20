import { useState, useEffect } from "react"
import Link from "next/link"
import Select from "react-select"
import Head from "next/head"
import { getServerBaseUrl } from "../lib/serverBaseUrl"
import { selectStyles } from "../lib/selectStyles"

function normalizeOfficials(rows) {
  return rows
    .map((row) => ({
      ...row,
      returnCount: Number(row?.return_count ?? row?.returnCount ?? 0) || 0
    }))
    .filter((row) => row.name && row.slug)
}

const API_CACHE_BUSTER = "3"

export async function getServerSideProps({ req }) {
  const baseUrl = getServerBaseUrl(req)
  try {
    const yearsRes = await fetch(`${baseUrl}/api/years`)
    if (!yearsRes.ok) throw new Error("Failed to fetch years")
    const { years = [], latestYear = "" } = await yearsRes.json()
    const yearParam = latestYear ? `year=${encodeURIComponent(latestYear)}` : "period=All"
    const res = await fetch(`${baseUrl}/api/officials?${yearParam}&v=${API_CACHE_BUSTER}`)
    if (!res.ok) throw new Error("API failed")
    const officials = normalizeOfficials(await res.json())
    return { props: { officials, years, latestYear } }
  } catch (err) {
    console.error("Error fetching officials or years:", err)
    return { props: { officials: [], years: [], latestYear: "" } }
  }
}

export default function OfficialsPage({ officials: initialOfficials, years, latestYear }) {
  const [selectedTitles, setSelectedTitles] = useState([])
  const [selectedYear, setSelectedYear] = useState(latestYear)
  const [sortBy, setSortBy] = useState("name")
  const [officials, setOfficials] = useState(normalizeOfficials(initialOfficials))
  const [selectedName, setSelectedName] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    const url = selectedYear
      ? `/api/officials?year=${encodeURIComponent(selectedYear)}&v=${API_CACHE_BUSTER}`
      : `/api/officials?period=All&v=${API_CACHE_BUSTER}`
    fetch(url)
      .then((res) => res.json())
      .then((data) => setOfficials(normalizeOfficials(data)))
      .finally(() => setIsLoading(false))
  }, [selectedYear])

  const uniqueTitles = Array.from(
    new Set(
      officials
        .map((o) => o.job_title)
        .filter(Boolean)
        .sort()
    )
  )

  const titleOptions = uniqueTitles.map((title) => ({ value: title, label: title }))
  const selectedTitleValues = selectedTitles.map((option) => option.value)

  const filtered = officials.filter((o) => {
    const nameMatch = selectedName ? o.name === selectedName.value : true
    const titleMatch =
      selectedTitleValues.length === 0 || selectedTitleValues.some((title) => (o.job_title || "").includes(title))
    return nameMatch && titleMatch
  })

  const deduped = Array.from(new Map(filtered.map((o) => [o.slug, o])).values())
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
        <title>Lobbyieng - All Officials</title>
      </Head>
      <div className="min-h-screen">
        {isLoading && (
          <div className="w-full h-1 bg-blue-200 dark:bg-blue-900">
            <div className="h-1 bg-blue-600 dark:bg-blue-400 animate-pulse w-full"></div>
          </div>
        )}
        <header className="hero-shell">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">All Officials</h1>
            <p className="hero-subtitle mt-2">Filter by year, title, and name to inspect activity patterns.</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="surface-card mb-6">
            <div className="flex flex-wrap gap-6">
              {/* Job Title Filter */}
              <div className="w-72 accent-blue-600 dark:accent-blue-400">
                <label className="block mb-1 text-sm font-semibold text-muted-ui">Job Title</label>
                <Select
                  options={titleOptions}
                  value={selectedTitles}
                  onChange={(values) => setSelectedTitles(values || [])}
                  isMulti
                  isClearable
                  closeMenuOnSelect={false}
                  placeholder="Filter job titles..."
                  styles={selectStyles}
                />
              </div>
              {/* Year Filter */}
              <div className="w-50">
                <label className="block mb-1 text-sm font-semibold text-muted-ui">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="native-select w-full px-4 py-2 border border-[var(--ui-border)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Years</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              {/* Name Filter */}
              <div className="w-64 accent-blue-600 dark:accent-blue-400">
                <label className="block mb-1 text-sm font-semibold text-muted-ui">Name</label>
                <Select
                  options={nameOptions}
                  value={selectedName}
                  onChange={setSelectedName}
                  isClearable
                  placeholder="Search by name..."
                  styles={selectStyles}
                />
              </div>
              {/* Sort */}
              <div className="w-40">
                <label className="block mb-1 text-sm font-semibold text-muted-ui">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="native-select w-full px-4 py-2 border border-[var(--ui-border)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="surface-card">
            <h2 className="text-2xl font-semibold mb-4">Officials ({isLoading ? "..." : sortedDeduped.length} results)</h2>
            {isLoading ? (
              <div className="text-center text-blue-600 py-8">Loading officials...</div>
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
          </div>
        </main>
      </div>
    </>
  )
}
