import { useState, useEffect } from "react"
import Select from "react-select"
import Head from "next/head"
import Link from "next/link"

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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (req ? `https://${req.headers.host}` : "")
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
    if (!selectedPeriod) return
    setIsLoading(true)
    async function fetchLobbyists() {
      const url = selectedPeriod
        ? `/api/lobbyists?period=${encodeURIComponent(selectedPeriod)}`
        : `/api/lobbyists?period=All`
      const res = await fetch(url)
      const names = res.ok ? await res.json() : []
      setLobbyists(names.map((name) => ({ name, slug: slugify(name) })))
      setSelectedName(null) // Reset name filter on period change
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
      <div className="min-h-screen bg-cb-light-background dark:bg-cb-dark-background text-cb-light-text dark:text-cb-dark-text">
        {isLoading && (
          <div className="w-full h-1 bg-blue-200 dark:bg-blue-900">
            <div className="h-1 bg-blue-600 dark:bg-blue-400 animate-pulse w-full"></div>
          </div>
        )}
        <header className="bg-blue-900 dark:bg-gray-800 text-white dark:text-cb-dark-text py-4 shadow">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold">Lobbyists</h1>
            <p className="mt-2 text-lg">Browse all registered lobbyists.</p>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-md shadow p-4 mb-6 flex flex-col sm:flex-row gap-6 items-center">
            {/* Period Filter */}
            <div className="w-50">
              <label className="block text-sm font-medium text-cb-light-text dark:text-cb-dark-text mb-1">Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 shadow-sm bg-white dark:bg-gray-700 text-cb-light-text dark:text-cb-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-cb-light-text dark:text-cb-dark-text mb-1">Name</label>
              <Select
                options={nameOptions}
                value={selectedName}
                onChange={setSelectedName}
                isClearable
                placeholder="Search by name..."
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: "hsl(var(--cb-light-background))",
                    borderColor: "#CBD5E0",
                    color: "#111"
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: "#fff",
                    color: "#111",
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
                  className="text-red-600 underline text-sm"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
          <section className="bg-white dark:bg-gray-800 rounded-md shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Lobbyists ({isLoading ? "..." : filtered.length} results)</h2>
            {isLoading ? (
              <div className="text-center text-blue-600 py-8">Loading lobbyists...</div>
            ) : filtered.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filtered.map((lobbyist) => (
                  <li
                    key={lobbyist.slug}
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md p-4 hover:shadow transition"
                  >
                    <Link legacyBehavior href={`/lobbyists/${lobbyist.slug}`}>
                      <a>
                        <h3 className="font-bold text-cb-light-text dark:text-cb-dark-text">{lobbyist.name}</h3>
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400">No results found.</p>
            )}
          </section>
        </main>
      </div>
    </>
  )
}
