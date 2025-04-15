import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Select from "react-select"
import Head from "next/head"

export async function getServerSideProps() {
    // Get the most recent period directly from the database
    let latestPeriod = null
    try {
        // Use a direct DB query to avoid unnecessary API calls
        const res = await fetch("http://localhost:3000/api/periods-latest")
        if (!res.ok) throw new Error("Failed to fetch latest period")
        const { period } = await res.json()
        latestPeriod = period
    } catch (err) {
        // Fallback to hardcoded value if needed
        latestPeriod = "1 Jan, 2025 to 30 Apr, 2025"
        console.error("Error determining latest period:", err)
    }
    try {
        // Fetch only officials for the latest period
        const res = await fetch(
            `http://localhost:3000/api/officials?period=${encodeURIComponent(
                latestPeriod
            )}`
        )
        if (!res.ok) throw new Error("API failed")
        const officials = await res.json()
        return { props: { officials } }
    } catch (err) {
        console.error("Error fetching officials:", err)
        return { props: { officials: [] } }
    }
}

export default function OfficialsPage({ officials: initialOfficials }) {
    // Job Title Filter
    const [selectedTitles, setSelectedTitles] = useState(new Set())
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [titleSearchInput, setTitleSearchInput] = useState("")
    // Period Filter
    const [allPeriods, setAllPeriods] = useState([])
    const [selectedPeriod, setSelectedPeriod] = useState("")
    const [officials, setOfficials] = useState(initialOfficials)
    // Name Filter
    const [selectedName, setSelectedName] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    // Fetch all periods on mount
    useEffect(() => {
        fetch("/api/periods")
            .then((res) => res.json())
            .then((data) => {
                if (data.periods && data.periods.length > 0) {
                    setAllPeriods(data.periods)
                    // Default to latest period (last in sorted list)
                    setSelectedPeriod(data.periods[data.periods.length - 1])
                }
            })
    }, [])

    // Always fetch, even if selectedPeriod is empty (All)
    useEffect(() => {
        setIsLoading(true)
        const url = selectedPeriod
            ? `/api/officials?period=${encodeURIComponent(selectedPeriod)}`
            : `/api/officials?period=All`
        fetch(url)
            .then((res) => res.json())
            .then((data) => setOfficials(data))
            .finally(() => setIsLoading(false))
    }, [selectedPeriod])

    // Unique job titles (remove 'All' option)
    const uniqueTitles = Array.from(
        new Set(
            officials
                .map((o) => o.job_title)
                .filter(Boolean)
                .sort()
        )
    )

    // Toggle job title filter (no 'All' logic)
    const toggleTitle = (title) => {
        const updated = new Set(selectedTitles)
        updated.has(title) ? updated.delete(title) : updated.add(title)
        setSelectedTitles(updated)
    }

    // Dropdown close on outside click
    const dropdownRef = useRef(null)
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    // Filtering
    const filtered = officials.filter((o) => {
        const matchesName = selectedName ? o.name === selectedName.value : true
        const matchesTitle =
            selectedTitles.size === 0 ||
            (o.job_title &&
                [...selectedTitles].some((title) =>
                    o.job_title.includes(title)
                ))
        // Remove matchesPeriod check: API already filters by period
        return matchesName && matchesTitle
    })

    const deduped = Array.from(
        new Map(filtered.map((o) => [o.slug, o])).values()
    )

    // react-select options for the Name filter using deduped official names.
    const nameOptions = deduped.map((o) => ({
        value: o.name,
        label: o.name,
    }))

    return (
        <>
            <Head>
                <title>Lobbyieng - All Officials</title>
            </Head>
            <div className="min-h-screen bg-gray-50">
                {/* Loading bar */}
                {isLoading && (
                    <div className="w-full h-1 bg-blue-200">
                        <div
                            className="h-1 bg-blue-600 animate-pulse w-full"
                            style={{ width: "100%" }}
                        ></div>
                    </div>
                )}
                <header className="bg-blue-900 text-white py-4 shadow">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <h1 className="text-4xl font-bold">
                            All Elected Officials
                        </h1>
                        <p className="mt-2 text-lg">
                            Browse and filter all officials by job title,
                            period, or name.
                        </p>
                    </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 py-8">
                    <div className="bg-white rounded-md shadow-md p-6 mb-6">
                        <div className="flex flex-wrap gap-6">
                            {/* Job Title Filter (Dropdown) */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="block mb-1 text-sm font-medium text-gray-700">
                                    Job Title
                                </label>
                                <button
                                    onClick={() =>
                                        setDropdownOpen(!dropdownOpen)
                                    }
                                    className="w-64 border border-gray-300 rounded-md px-4 py-2 text-left bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {selectedTitles.size
                                        ? [...selectedTitles].join(", ")
                                        : "Filter by Job Title"}
                                </button>
                                {dropdownOpen && (
                                    <div className="absolute mt-2 w-64 max-h-64 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg z-10 p-3 space-y-1">
                                        <input
                                            type="text"
                                            placeholder="Search titles..."
                                            value={titleSearchInput}
                                            onChange={(e) =>
                                                setTitleSearchInput(
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="text-right text-sm">
                                            <button
                                                onClick={() =>
                                                    setSelectedTitles(new Set())
                                                }
                                                className="text-red-500 hover:underline"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        {uniqueTitles
                                            .filter((title) =>
                                                title
                                                    .toLowerCase()
                                                    .includes(
                                                        titleSearchInput.toLowerCase()
                                                    )
                                            )
                                            .map((title) => (
                                                <label
                                                    key={title}
                                                    className="block text-sm cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTitles.has(
                                                            title
                                                        )}
                                                        onChange={() =>
                                                            toggleTitle(title)
                                                        }
                                                        className="mr-2"
                                                    />
                                                    {title}
                                                </label>
                                            ))}
                                    </div>
                                )}
                            </div>
                            {/* Period Filter */}
                            <div className="w-50">
                                <label className="block mb-1 text-sm font-medium text-gray-700">
                                    Period
                                </label>
                                <select
                                    value={selectedPeriod}
                                    onChange={(e) =>
                                        setSelectedPeriod(e.target.value)
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Periods</option>
                                    {allPeriods.map((period) => (
                                        <option key={period} value={period}>
                                            {period}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {/* Name Filter using react-select */}
                            <div className="w-64">
                                <label className="block mb-1 text-sm font-medium text-gray-700">
                                    Name
                                </label>
                                <Select
                                    options={nameOptions}
                                    value={selectedName}
                                    onChange={(option) =>
                                        setSelectedName(option)
                                    }
                                    isClearable
                                    placeholder="Search by name..."
                                    styles={{
                                        control: (provided) => ({
                                            ...provided,
                                            borderColor: "gray",
                                        }),
                                        menu: (provided) => ({
                                            ...provided,
                                            zIndex: 9999,
                                            maxHeight: "300px",
                                            overflowY: "auto",
                                            backgroundColor: "white",
                                        }),
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-md shadow-md p-6">
                        <h2 className="text-2xl font-semibold mb-4">
                            Officials ({isLoading ? "..." : deduped.length}{" "}
                            results)
                        </h2>
                        {isLoading ? (
                            <div className="text-center text-blue-600 py-8">
                                Loading officials...
                            </div>
                        ) : deduped.length > 0 ? (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {deduped.map((official) => (
                                    <li
                                        key={official.slug}
                                        className="border rounded-md p-4 hover:shadow transition"
                                    >
                                        <Link
                                            legacyBehavior
                                            href={`/officials/${official.slug}`}
                                        >
                                            <a>
                                                <h3 className="font-bold text-gray-900">
                                                    {official.name}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {official.job_title}
                                                </p>
                                            </a>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500">
                                No results found.
                            </p>
                        )}
                    </div>
                </main>
            </div>
        </>
    )
}
