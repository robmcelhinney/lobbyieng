import { useState } from "react"
import Link from "next/link"
import Select from "react-select"
import Head from "next/head"

const topOfficialsTitles = [
    "TD",
    "An Tánaiste",
    "An Taoiseach",
    "Minister",
    "Minister of State",
    "Tánaiste and Minister",
]

export async function getServerSideProps() {
    try {
        const jobTitlesParam = topOfficialsTitles.join(",")
        // Fetch all periods by default (period=All) and filter by topOfficials job titles
        const res = await fetch(
            `http://localhost:3000/api/officials?period=All&job_titles=${encodeURIComponent(
                jobTitlesParam
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

// Helper to deduplicate officials by slug
function dedupedOfficials(array) {
    return Array.from(new Map(array.map((item) => [item.slug, item])).values())
}

export default function Index({ officials }) {
    // Show only TDs/An Tánaiste/An Taoiseach.
    const topOfficials = officials.filter((o) =>
        topOfficialsTitles.some((title) => o.job_title?.includes(title))
    )

    // Build period options from topOfficials.
    // Sort periods by year, then by month
    function extractYearMonth(period) {
        // Assumes format like '1 Jan, 2016 to 30 Apr, 2016'
        const match = period.match(/(\d{1,2}) (\w+), (\d{4})/)
        if (!match) return { year: 0, month: 0 }
        const year = parseInt(match[3], 10)
        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ]
        const month = monthNames.indexOf(match[2]) + 1
        return { year, month }
    }
    const allPeriods =
        Array.from(new Set(topOfficials.flatMap((o) => o.periods || []))).sort(
            (a, b) => {
                const ay = extractYearMonth(a)
                const by = extractYearMonth(b)
                if (ay.year !== by.year) return ay.year - by.year
                return ay.month - by.month
            }
        ) || []
    // // Default to latest period (assumes ascending order)
    const defaultPeriod =
        allPeriods.length > 0 ? allPeriods[allPeriods.length - 1] : ""

    // // Default to 'All Periods' (empty string)
    // const defaultPeriod = ""

    // Filters: Name and Period.
    const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod)
    const [selectedName, setSelectedName] = useState(null)

    // Final filter: if a name is selected, filter by that; otherwise filter by period.
    const filtered = topOfficials.filter((o) => {
        const matchesName = selectedName ? o.name === selectedName.value : true
        const matchesPeriod =
            !selectedPeriod || (o.periods && o.periods.includes(selectedPeriod))
        return matchesName && matchesPeriod
    })

    const deduped = dedupedOfficials(filtered)

    // react‑select options for the Name filter using deduped official names.
    const nameOptions = deduped.map((o) => ({
        value: o.name,
        label: o.name,
    }))

    return (
        <>
            <Head>
                <title>Lobbyieng - Dáil</title>
            </Head>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-blue-900 text-white py-4 shadow">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <h1 className="text-4xl font-bold">
                            Elected Officials – Lobbying Data
                        </h1>
                        <p className="mt-2 text-lg">
                            Search for your favourite member of the Dáil.
                        </p>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-6xl mx-auto px-4 py-8">
                    {/* Filters Bar at Top */}
                    <div className="bg-white rounded-md shadow p-4 mb-6 flex flex-col sm:flex-row gap-6 items-center">
                        {/* Period Filter */}
                        <div className="w-40">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Period
                            </label>
                            <select
                                value={selectedPeriod}
                                onChange={(e) =>
                                    setSelectedPeriod(e.target.value)
                                }
                                className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                            </label>
                            <Select
                                options={nameOptions}
                                value={selectedName}
                                onChange={(option) => setSelectedName(option)}
                                isClearable
                                placeholder="Search by name..."
                                styles={{
                                    control: (provided) => ({
                                        ...provided,
                                        borderColor: "#CBD5E0",
                                        boxShadow: "none",
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

                        {/* Clear Filters Button */}
                        {(selectedPeriod || selectedName) && (
                            <div>
                                <button
                                    onClick={() => {
                                        setSelectedPeriod(defaultPeriod)
                                        setSelectedName(null)
                                    }}
                                    className="text-red-600 underline text-sm"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Officials Results */}
                    <section className="bg-white rounded-md shadow p-6">
                        <h2 className="text-2xl font-semibold mb-4">
                            Officials ({deduped.length} results)
                        </h2>
                        {deduped.length > 0 ? (
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
                    </section>
                </main>
            </div>
        </>
    )
}
