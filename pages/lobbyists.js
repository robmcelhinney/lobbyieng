import { useState, useEffect } from "react"
import Select from "react-select"
import Head from "next/head"
import Link from "next/link"
import { getServerBaseUrl } from "../lib/serverBaseUrl"

// Utility function to match API slugify
function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}]+/gu, "-") // Replace non-alphanumeric (unicode) with dash
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, "") // Trim leading/trailing dashes
    .toLowerCase()
}

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
    const lobbyistsRes = await fetch(`${baseUrl}/api/lobbyists?period=${encodeURIComponent(latestPeriod)}`)
    const names = lobbyistsRes.ok ? await lobbyistsRes.json() : []
    const lobbyists = names.map((name) => ({ name, slug: slugify(name) }))
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
  const [isLoading, setIsLoading] = useState(false)
  // Update lobbyists when period changes
  useEffect(() => {
    async function fetchLobbyists() {
      setIsLoading(true)
      const url =
        selectedPeriod && selectedPeriod !== "All"
        ? `/api/lobbyists?period=${encodeURIComponent(selectedPeriod)}`
        : `/api/lobbyists?period=All`
      const res = await fetch(url)
      const names = res.ok ? await res.json() : []
      setLobbyists(names.map((name) => ({ name, slug: slugify(name) })))
      setSelectedName(null); // Reset name filter on period change
      setIsLoading(false)
    }

    fetchLobbyists()
  }, [selectedPeriod])
  // Filtered list
  const filtered = selectedName ? lobbyists.filter((l) => l.name === selectedName.value) : lobbyists
  // react-select options
  const nameOptions = lobbyists.map((l) => ({ value: l.name, label: l.name }))
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
                className="w-full border border-[var(--ui-border)] rounded-md px-3 py-2 shadow-sm bg-white/80 dark:bg-slate-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                styles={{
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
                }}
              />
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
            <h2 className="text-2xl font-semibold mb-4">Lobbyists ({isLoading ? "..." : filtered.length} results)</h2>
            {isLoading ? (
              <div className="text-center text-blue-600 py-8">Loading lobbyists...</div>
            ) : filtered.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filtered.map((lobbyist) => (
                  <li key={lobbyist.slug}>
                    <Link
                      href={`/lobbyists/${lobbyist.slug}`}
                      className="surface-card card-interactive no-underline block min-h-[108px]"
                    >
                      <h3 className="font-bold">{lobbyist.name}</h3>
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
