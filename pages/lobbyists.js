import { useState, useEffect } from "react"
import Select from "react-select"
import Head from "next/head"
import Link from "next/link"
import { getServerBaseUrl } from "../lib/serverBaseUrl"
import { selectStyles } from "../lib/selectStyles"

// Utility function to match API slugify
function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}]+/gu, "-") // Replace non-alphanumeric (unicode) with dash
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, "") // Trim leading/trailing dashes
    .toLowerCase()
}

function normalizeLobbyists(rows) {
  return rows
    .map((row) => {
      if (typeof row === "string") {
        return { name: row, slug: slugify(row), returnCount: 0 }
      }

      const name = row?.name || row?.lobbyist_name || ""
      return {
        name,
        slug: slugify(name),
        returnCount: Number(row?.returnCount ?? row?.return_count ?? 0) || 0
      }
    })
    .filter((row) => row.name)
}

const API_CACHE_BUSTER = "3"

export async function getServerSideProps({ req }) {
  const baseUrl = getServerBaseUrl(req)
  try {
    const yearsRes = await fetch(`${baseUrl}/api/years`)
    const yearsJson = yearsRes.ok ? await yearsRes.json() : { years: [], latestYear: "" }
    const years = yearsJson.years || []
    const latestYear = yearsJson.latestYear || years.at(-1) || ""
    const lobbyistsRes = await fetch(`${baseUrl}/api/lobbyists?year=${encodeURIComponent(latestYear)}&v=${API_CACHE_BUSTER}`)
    const rows = lobbyistsRes.ok ? await lobbyistsRes.json() : []
    const lobbyists = normalizeLobbyists(rows)
    return {
      props: {
        lobbyists,
        years,
        latestYear
      }
    }
  } catch (err) {
    console.error("Error fetching lobbyists or periods:", err)
    return { props: { lobbyists: [], years: [], latestYear: "" } }
  }
}

export default function LobbyistsPage({ lobbyists: initialLobbyists, years, latestYear }) {
  const [selectedName, setSelectedName] = useState(null)
  const [selectedYear, setSelectedYear] = useState(latestYear)
  const [lobbyists, setLobbyists] = useState(initialLobbyists)
  const [sortBy, setSortBy] = useState("name")
  const [isLoading, setIsLoading] = useState(false)
  // Update lobbyists when year changes
  useEffect(() => {
    async function fetchLobbyists() {
      setIsLoading(true)
      const url =
        selectedYear
        ? `/api/lobbyists?year=${encodeURIComponent(selectedYear)}&v=${API_CACHE_BUSTER}`
        : `/api/lobbyists?period=All&v=${API_CACHE_BUSTER}`
      const res = await fetch(url)
      const rows = res.ok ? await res.json() : []
      setLobbyists(normalizeLobbyists(rows))
      setSelectedName(null)
      setIsLoading(false)
    }

    fetchLobbyists()
  }, [selectedYear])
  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "returns-desc", label: "Most returns" },
    { value: "returns-asc", label: "Fewest returns" }
  ]
  const nameOptions = [...lobbyists]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((l) => ({ value: l.name, label: l.name }))
  const filtered = selectedName ? lobbyists.filter((l) => l.name === selectedName.value) : lobbyists
  const sortedFiltered = [...filtered].sort((a, b) => {
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
        <title>Lobbyieng – Lobbyists</title>
      </Head>
      <div className="min-h-screen">
        {isLoading && (
          <div className="w-full h-1 bg-blue-200 dark:bg-blue-900">
            <div className="h-1 bg-blue-600 dark:bg-blue-400 animate-pulse w-full"></div>
          </div>
        )}
        <header className="hero-shell">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Lobbyists</h1>
            <p className="hero-subtitle mt-2">Browse organizations and individuals filing lobbying returns.</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="surface-card mb-6 flex flex-col sm:flex-row gap-6 items-end">
            {/* Year Filter */}
            <div className="w-50">
              <label className="block text-sm font-semibold text-muted-ui mb-1">Year</label>
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
            {/* Name Filter */}
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
              <label className="block text-sm font-semibold text-muted-ui mb-1">Sort by</label>
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
            {(selectedName || selectedYear !== latestYear) && (
              <div>
                <button
                  onClick={() => {
                    setSelectedName(null)
                    setSelectedYear("")
                  }}
                  className="text-sm font-semibold text-[color:var(--ui-primary)] hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
          <section className="surface-card">
            <h2 className="text-2xl font-semibold mb-4">Lobbyists ({isLoading ? "..." : sortedFiltered.length} results)</h2>
            {isLoading ? (
              <div className="text-center text-blue-600 py-8">Loading lobbyists...</div>
            ) : sortedFiltered.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {sortedFiltered.map((lobbyist) => (
                  <li key={lobbyist.slug}>
                    <Link
                      href={`/lobbyists/${lobbyist.slug}`}
                      className="surface-card card-interactive no-underline block min-h-[108px]"
                    >
                      <h3 className="font-bold">{lobbyist.name}</h3>
                      <p className="mt-2 text-sm text-muted-ui">
                        {lobbyist.returnCount} return{lobbyist.returnCount === 1 ? "" : "s"}
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
