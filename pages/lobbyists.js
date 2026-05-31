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

const API_CACHE_BUSTER = "2"

export async function getServerSideProps({ req }) {
  const baseUrl = getServerBaseUrl(req)
  try {
    // Fetch all unique periods
    const periodsRes = await fetch(`${baseUrl}/api/officials?period=All`)
    const officials = periodsRes.ok ? await periodsRes.json() : []
    // Extract all unique periods from officials (like dail.js)
    const allPeriods = Array.from(new Set(officials.flatMap((o) => o.periods || [])))
    // Sort periods by year/month (like dail.js)
    function extractYearMonth(period) {
      const match = period && period.match(/(\d{1,2}) (\w+), (\d{4})/)
      if (!match) return { year: 0, month: 0 }
      const year = parseInt(match[3], 10)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const month = monthNames.indexOf(match[2]) + 1
      return { year, month }
    }
    allPeriods.sort((a, b) => {
      const ay = extractYearMonth(a)
      const by = extractYearMonth(b)
      if (ay.year !== by.year) return ay.year - by.year
      return ay.month - by.month
    })
    // Fetch latest period
    const latestRes = await fetch(`${baseUrl}/api/periods-latest`)
    const latestJson = latestRes.ok ? await latestRes.json() : {}
    const latestPeriod = latestJson.period || (allPeriods.length > 0 ? allPeriods[allPeriods.length - 1] : "")
    // Fetch lobbyists for latest period
    const lobbyistsRes = await fetch(
      `${baseUrl}/api/lobbyists?period=${encodeURIComponent(latestPeriod)}&v=${API_CACHE_BUSTER}`
    )
    const rows = lobbyistsRes.ok ? await lobbyistsRes.json() : []
    const lobbyists = normalizeLobbyists(rows)
    return {
      props: {
        lobbyists,
        allPeriods,
        latestPeriod
      }
    }
  } catch (err) {
    console.error("Error fetching lobbyists or periods:", err)
    return { props: { lobbyists: [], allPeriods: [], latestPeriod: "" } }
  }
}

export default function LobbyistsPage({ lobbyists: initialLobbyists, allPeriods, latestPeriod }) {
  const [selectedName, setSelectedName] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(latestPeriod)
  const [lobbyists, setLobbyists] = useState(initialLobbyists)
  const [sortBy, setSortBy] = useState("name")
  const [isLoading, setIsLoading] = useState(false)
  // Update lobbyists when period changes
  useEffect(() => {
    async function fetchLobbyists() {
      setIsLoading(true)
      const url =
        selectedPeriod && selectedPeriod !== "All"
        ? `/api/lobbyists?period=${encodeURIComponent(selectedPeriod)}&v=${API_CACHE_BUSTER}`
        : `/api/lobbyists?period=All&v=${API_CACHE_BUSTER}`
      const res = await fetch(url)
      const rows = res.ok ? await res.json() : []
      setLobbyists(normalizeLobbyists(rows))
      setSelectedName(null)
      setIsLoading(false)
    }

    fetchLobbyists()
  }, [selectedPeriod])
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
            {/* Period Filter */}
            <div className="w-50">
              <label className="block text-sm font-semibold text-muted-ui mb-1">Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value || "All")}
                className="native-select w-full border border-[var(--ui-border)] rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Periods</option>
                {allPeriods.map((period) => (
                  <option key={period} value={period}>
                    {period}
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
            {(selectedName || selectedPeriod !== latestPeriod) && (
              <div>
                <button
                  onClick={() => {
                    setSelectedName(null)
                    setSelectedPeriod("")
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
