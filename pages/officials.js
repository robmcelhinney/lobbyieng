import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Select from "react-select"
import Head from "next/head"

export async function getServerSideProps() {
    let latestPeriod = null
    try {
        const res = await fetch("http://localhost:3000/api/periods-latest")
        if (!res.ok) throw new Error("Failed to fetch latest period")
        const { period } = await res.json()
        latestPeriod = period
    } catch (err) {
        latestPeriod = "1 Jan, 2025 to 30 Apr, 2025"
        console.error("Error determining latest period:", err)
    }

    try {
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
    const [selectedTitles, setSelectedTitles] = useState(new Set())
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [titleSearchInput, setTitleSearchInput] = useState("")
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

    const toggleTitle = (title) => {
        const updated = new Set(selectedTitles)
        // Fix: always call delete/add, not a conditional expression
        if (updated.has(title)) {
            updated.delete(title)
        } else {
            updated.add(title)
        }
        setSelectedTitles(updated)
    }

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
        return () =>
            document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const filtered = officials.filter((o) => {
        const nameMatch = selectedName ? o.name === selectedName.value : true
        const titleMatch =
            selectedTitles.size === 0 ||
            [...selectedTitles].some((title) => o.job_title?.includes(title))
        return nameMatch && titleMatch
    })

    const deduped = Array.from(
        new Map(filtered.map((o) => [o.slug, o])).values()
    )
    const nameOptions = deduped.map((o) => ({ value: o.name, label: o.name }))

    return (
        <>
            <Head>
                <title>Lobbyieng - All Officials</title>
            </Head>
            <div className="min-h-screen bg-cb-light-background dark:bg-cb-dark-background text-cb-light-text dark:text-cb-dark-text">
                {isLoading && (
                    <div className="w-full h-1 bg-blue-200 dark:bg-blue-900">
                        <div className="h-1 bg-blue-600 dark:bg-blue-400 animate-pulse w-full"></div>
                    </div>
                )}
                <header className="bg-blue-900 dark:bg-gray-800 text-white dark:text-cb-dark-text py-4 shadow">
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
                    <div className="bg-white dark:bg-gray-800 rounded-md shadow-md p-6 mb-6">
                        <div className="flex flex-wrap gap-6">
                            {/* Job Title Filter */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="block mb-1 text-sm font-medium text-cb-light-text dark:text-cb-dark-text">
                                    Job Title
                                </label>
                                <button
                                    onClick={() =>
                                        setDropdownOpen(!dropdownOpen)
                                    }
                                    className="w-64 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 text-left bg-white dark:bg-gray-700 text-cb-light-text dark:text-cb-dark-text shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {selectedTitles.size
                                        ? [...selectedTitles].join(", ")
                                        : "Filter by Job Title"}
                                </button>
                                {dropdownOpen && (
                                    <div className="absolute mt-2 w-64 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10 p-3 space-y-1">
                                        <input
                                            type="text"
                                            placeholder="Search titles..."
                                            value={titleSearchInput}
                                            onChange={(e) =>
                                                setTitleSearchInput(
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-cb-light-text dark:text-cb-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="text-right text-sm">
                                            <button
                                                onClick={() =>
                                                    setSelectedTitles(new Set())
                                                }
                                                className="text-red-500 dark:text-red-400 hover:underline"
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
                                                    className="block text-sm font-medium text-cb-light-text dark:text-cb-dark-text mb-1"
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
                                <label className="block mb-1 text-sm font-medium text-cb-light-text dark:text-cb-dark-text">
                                    Period
                                </label>
                                <select
                                    value={selectedPeriod}
                                    onChange={(e) =>
                                        setSelectedPeriod(e.target.value)
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-cb-light-text dark:text-cb-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                <label className="block mb-1 text-sm font-medium text-cb-light-text dark:text-cb-dark-text">
                                    Name
                                </label>
                                <Select
                                    options={nameOptions}
                                    value={selectedName}
                                    onChange={setSelectedName}
                                    isClearable
                                    placeholder="Search by name..."
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            backgroundColor:
                                                "hsl(var(--cb-light-background))",
                                            borderColor: "#CBD5E0",
                                            color: "#111",
                                        }),
                                        menu: (base) => ({
                                            ...base,
                                            backgroundColor: "#fff",
                                            color: "#111",
                                            zIndex: 9999,
                                        }),
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-md shadow-md p-6">
                        <h2 className="text-2xl font-semibold mb-4">
                            Officials ({isLoading ? "..." : deduped.length}{" "}
                            results)
                        </h2>
                        {isLoading ? (
                            <div className="text-center text-blue-600 dark:text-blue-300 py-8">
                                Loading officials...
                            </div>
                        ) : deduped.length > 0 ? (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {deduped.map((official) => (
                                    <li
                                        key={official.slug}
                                        className="border border-gray-300 dark:border-gray-600 rounded-md p-4 bg-white dark:bg-gray-700 hover:shadow transition"
                                    >
                                        <Link
                                            legacyBehavior
                                            href={`/officials/${official.slug}`}
                                        >
                                            <a>
                                                <h3 className="font-bold text-cb-light-text dark:text-cb-dark-text">
                                                    {official.name}
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {official.job_title}
                                                </p>
                                            </a>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400">
                                No results found.
                            </p>
                        )}
                    </div>
                </main>
            </div>
        </>
    )
}
