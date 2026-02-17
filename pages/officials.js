import { useState, useEffect } from "react"
import Link from "next/link"
import Select from "react-select"
import Head from "next/head"
import { getServerBaseUrl } from "../lib/serverBaseUrl"

export async function getServerSideProps({ req }) {
  const baseUrl = getServerBaseUrl(req)
  let latestPeriod = null
  try {
    const res = await fetch(`${baseUrl}/api/periods-latest`)
    if (!res.ok) throw new Error("Failed to fetch latest period")
    const { period } = await res.json()
    latestPeriod = period
  } catch (err) {
    latestPeriod = "1 Jan, 2025 to 30 Apr, 2025"
    console.error("Error determining latest period:", err)
  }

  try {
    // Always use latestPeriod for initial fetch, never 'All'
    const periodParam = latestPeriod ? `period=${encodeURIComponent(latestPeriod)}` : ""
    const res = await fetch(`${baseUrl}/api/officials?${periodParam}`)
    if (!res.ok) throw new Error("API failed")
    const officials = await res.json()
    return { props: { officials } }
  } catch (err) {
    console.error("Error fetching officials:", err)
    return { props: { officials: [] } }
  }
}

export default function OfficialsPage({ officials: initialOfficials }) {
  const [selectedTitles, setSelectedTitles] = useState([])
  const [allPeriods, setAllPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [officials, setOfficials] = useState(initialOfficials)
  const [selectedName, setSelectedName] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetch("/api/periods")
      .then((res) => res.json())
      .then((data) => {
        if (data.periods?.length) {
          setAllPeriods(data.periods)
          setSelectedPeriod(data.periods.at(-1))
        }
      })
  }, [])

  useEffect(() => {
    setIsLoading(true)
    const url = selectedPeriod
      ? `/api/officials?period=${encodeURIComponent(selectedPeriod)}`
      : `/api/officials?period=All`
    fetch(url)
      .then((res) => res.json())
      .then(setOfficials)
      .finally(() => setIsLoading(false))
  }, [selectedPeriod])

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
  const nameOptions = deduped.map((o) => ({ value: o.name, label: o.name }))

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
            <p className="hero-subtitle mt-2">Filter by period, title, and name to inspect current activity patterns.</p>
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
              {/* Period Filter */}
              <div className="w-50">
                <label className="block mb-1 text-sm font-semibold text-muted-ui">Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--ui-border)] rounded-md shadow-sm bg-white/80 dark:bg-slate-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block mb-1 text-sm font-semibold text-muted-ui">Name</label>
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
            </div>
          </div>
          <div className="surface-card">
            <h2 className="text-2xl font-semibold mb-4">Officials ({isLoading ? "..." : deduped.length} results)</h2>
            {isLoading ? (
              <div className="text-center text-blue-600 py-8">Loading officials...</div>
            ) : deduped.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {deduped.map((official) => (
                  <li key={official.slug}>
                    <Link
                      href={`/officials/${official.slug}`}
                      className="surface-card card-interactive no-underline block min-h-[120px]"
                    >
                      <h3 className="font-bold">{official.name}</h3>
                      <p className="text-sm text-muted-ui mt-1">{official.job_title}</p>
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
