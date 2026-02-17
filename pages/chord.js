import Head from "next/head"
import ChordDiagram from "../components/ChordDiagram"
import { useEffect, useState } from "react"
import Select from "react-select"
import { useRouter } from "next/router"

export default function ChordPage() {
  const router = useRouter()
  const [officials, setOfficials] = useState([])
  const [selected1, setSelected1] = useState("")
  const [selected2, setSelected2] = useState("")
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [maxLobbyists, setMaxLobbyists] = useState(10)
  const [startYear, setStartYear] = useState(2015)
  const [endYear, setEndYear] = useState(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState([])
  const [copyStatus, setCopyStatus] = useState("")
  const [queryReady, setQueryReady] = useState(false)

  // Track color mode and update on class change
  const [colorMode, setColorMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light"
    }
    return "light"
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const observer = new MutationObserver(() => {
      setColorMode(document.documentElement.classList.contains("dark") ? "dark" : "light")
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    })
    return () => observer.disconnect()
  }, [])

  // For react-select dropdowns
  const officialOptions = officials.map((name) => ({
    value: name,
    label: name
  }))
  const selectedOption1 = officialOptions.find((o) => o.value === selected1) || null
  const selectedOption2 = officialOptions.find((o) => o.value === selected2) || null

  // Dynamic styles for react-select
  function getSelectStyles() {
    const mode = colorMode
    return {
      control: (base, state) => ({
        ...base,
        backgroundColor:
          mode === "dark"
            ? state.isFocused
              ? "#1f2937" // dark:bg-gray-800
              : "#374151" // dark:bg-gray-700
            : state.isFocused
              ? "#e0e7ef" // light: focus bg
              : "#fff", // light: bg-white
        borderColor: state.isFocused ? "#3b82f6" : mode === "dark" ? "#4b5563" : "#d1d5db", // gray-600 or gray-300
        color: mode === "dark" ? "#f9fafb" : "#111827",
        boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
        "&:hover": {
          borderColor: "#3b82f6"
        }
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: mode === "dark" ? "#1f2937" : "#fff",
        color: mode === "dark" ? "#f9fafb" : "#111827",
        zIndex: 9999
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isFocused ? "#2563eb" : "transparent",
        color: state.isFocused ? "#fff" : mode === "dark" ? "#f9fafb" : "#111827",
        cursor: "pointer",
        "&:active": {
          backgroundColor: "#1d4ed8"
        }
      }),
      singleValue: (base) => ({
        ...base,
        color: mode === "dark" ? "#f9fafb" : "#111827"
      }),
      input: (base) => ({
        ...base,
        color: mode === "dark" ? "#f9fafb" : "#111827"
      }),
      placeholder: (base) => ({
        ...base,
        color: mode === "dark" ? "#9ca3af" : "#6b7280"
      })
    }
  }

  // Fetch all officials for autocomplete and available years
  useEffect(() => {
    if (!router.isReady) return
    const { official1, official2, start_year, end_year, max_lobbyists } = router.query
    if (typeof official1 === "string") setSelected1(official1)
    if (typeof official2 === "string") setSelected2(official2)
    if (typeof start_year === "string" && /^\d+$/.test(start_year)) setStartYear(Number(start_year))
    if (typeof end_year === "string" && /^\d+$/.test(end_year)) setEndYear(Number(end_year))
    if (typeof max_lobbyists === "string" && /^\d+$/.test(max_lobbyists)) setMaxLobbyists(Number(max_lobbyists))
    setQueryReady(true)
  }, [router.isReady, router.query])

  useEffect(() => {
    fetch("/api/officials/names")
      .then((res) => res.json())
      .then((data) => setOfficials(data.map((o) => o.person_name)))
      .catch(() => setOfficials([]))
    // Fetch available years from the CSVs in /data or hardcode 2015 to current year
    const minYear = 2015
    const maxYear = new Date().getFullYear()
    setAvailableYears(Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i))
  }, [])

  useEffect(() => {
    if (!queryReady) return
    const nextQuery = {}
    if (selected1) nextQuery.official1 = selected1
    if (selected2) nextQuery.official2 = selected2
    if (startYear) nextQuery.start_year = String(startYear)
    if (endYear) nextQuery.end_year = String(endYear)
    if (maxLobbyists !== 10) nextQuery.max_lobbyists = String(maxLobbyists)
    router.replace({ pathname: "/chord", query: nextQuery }, undefined, { shallow: true })
  }, [selected1, selected2, startYear, endYear, maxLobbyists, queryReady, router])

  // Fetch chord data when both officials or time range changes
  useEffect(() => {
    if (!selected1 || !selected2 || selected1 === selected2) return
    setLoading(true)
    setError(null)
    fetch(
      `/api/chord-data?officials=${encodeURIComponent(selected1)},${encodeURIComponent(
        selected2
      )}&start_year=${startYear}&end_year=${endYear}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("No data found")
        return res.json()
      })
      .then((data) => {
        setRecords(data)
        setLoading(false)
      })
      .catch(() => {
        setError("No data found for these officials")
        setLoading(false)
      })
  }, [selected1, selected2, startYear, endYear])

  const copyPermalink = async () => {
    if (typeof window === "undefined") return
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyStatus("Link copied")
    } catch {
      setCopyStatus("Copy failed")
    }
    setTimeout(() => setCopyStatus(""), 1600)
  }

  return (
    <>
      <Head>
        <title>Compare Two Officials – Chord Diagram</title>
      </Head>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <header className="bg-blue-900 dark:bg-gray-800 text-white dark:text-gray-100 py-4">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold">Compare Two Officials</h1>
            <p className="mt-1">Select two officials to compare their lobbying connections.</p>
            <button
              type="button"
              onClick={copyPermalink}
              className="inline-block mt-3 px-4 py-2 rounded-md border border-white/60 text-white hover:bg-white/10 transition font-semibold text-sm"
            >
              Copy link to this view
            </button>
            {copyStatus ? <p className="text-xs mt-2 text-blue-100">{copyStatus}</p> : null}
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8 p-4 bg-white dark:bg-gray-800 rounded shadow text-left">
            <h2 className="text-xl font-bold mb-2">About the Chord Diagram</h2>
            <p className="mb-2">
              The Chord Diagram lets you compare the lobbying connections of any two Irish officials. Select two
              officials and a time range to see which lobbyists have interacted with both, and how frequently. The
              diagram visualizes shared and individual lobbying activity, helping you explore overlaps and relationships
              in lobbying efforts. Use the filters below to adjust the time period and number of lobbyists shown.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md p-8 flex flex-col items-center">
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center">
              <div>
                <label className="block mb-1 font-semibold">Official 1</label>
                <Select
                  options={officialOptions}
                  value={selectedOption1}
                  onChange={(option) => setSelected1(option ? option.value : "")}
                  isClearable
                  isSearchable
                  placeholder="Select official..."
                  styles={getSelectStyles()}
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold">Official 2</label>
                <Select
                  options={officialOptions}
                  value={selectedOption2}
                  onChange={(option) => setSelected2(option ? option.value : "")}
                  isClearable
                  isSearchable
                  placeholder="Select official..."
                  styles={getSelectStyles()}
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-center">
              <div>
                <label htmlFor="startYear" className="block mb-1 font-semibold">
                  Start Year
                </label>
                <select
                  id="startYear"
                  className="border border-gray-300 dark:border-gray-600 px-2 py-1 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="endYear" className="block mb-1 font-semibold">
                  End Year
                </label>
                <select
                  id="endYear"
                  className="border border-gray-300 dark:border-gray-600 px-2 py-1 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={endYear}
                  onChange={(e) => setEndYear(Number(e.target.value))}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col items-center mb-6">
              <label htmlFor="maxLobbyists" className="mb-1 font-semibold">
                Number of top lobbyists to show: {maxLobbyists}
              </label>
              <input
                id="maxLobbyists"
                type="range"
                min={3}
                max={50}
                value={maxLobbyists}
                onChange={(e) => setMaxLobbyists(Number(e.target.value))}
                className="w-64 accent-blue-600 dark:accent-blue-400"
              />
            </div>
            {selected1 && selected2 && selected1 === selected2 && (
              <p className="text-red-600 mb-4">Please select two different officials.</p>
            )}
            {loading && <p>Loading data…</p>}
            {error && <p className="text-red-600">{error}</p>}
            <div className="w-full flex justify-center items-center min-h-[700px]">
              {!loading && !error && records.length > 0 && (
                <ChordDiagram records={records} maxLobbyists={maxLobbyists} />
              )}
            </div>
            <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm">
              This diagram shows the relationships between lobbyists and the two selected officials. The thickness of
              each ribbon represents the number of lobbying records between a lobbyist and an official.
            </p>
          </div>
        </main>
      </div>
    </>
  )
}
