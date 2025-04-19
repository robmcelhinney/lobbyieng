import { useRouter } from "next/router"
import Head from "next/head"
import Select from "react-select"
import LobbyingCard from "../../components/LobbyingCard"
import { useState, useEffect, useMemo } from "react"
import Image from "next/image"

function toQueryString(query) {
    const params = []
    for (const key in query) {
        const value = query[key]
        if (Array.isArray(value)) {
            value.forEach((v) =>
                params.push(
                    `${encodeURIComponent(key)}=${encodeURIComponent(v)}`
                )
            )
        } else if (value !== undefined) {
            params.push(
                `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
            )
        }
    }
    return params.join("&")
}

export async function getServerSideProps({ params, query }) {
    if (!params || !params.slug) {
        return { notFound: true }
    }
    const res = await fetch(
        `http://localhost:3000/api/officials/${params.slug}?${toQueryString(
            query
        )}`
    )
    if (!res.ok) {
        return { notFound: true }
    }
    const officialData = await res.json()
    return {
        props: { officialData },
    }
}

// Politician image component to handle image existence check
function PoliticianImage({ slug, name }) {
    const [imgExists, setImgExists] = useState(true)
    useEffect(() => {
        setImgExists(true)
    }, [slug])
    if (!slug) return null
    const imagePath = `/images/td_thumbnails/${slug}.jpg`
    return imgExists ? (
        <Image
            src={imagePath}
            alt={name}
            className="mx-auto mb-4 rounded shadow max-h-48"
            width={192}
            height={192}
            onError={() => setImgExists(false)}
        />
    ) : null
}

export default function OfficialPage({ officialData }) {
    // Move all hooks to the top level, before any return or conditional
    const router = useRouter()
    // Default to empty object to avoid conditional hooks
    const safeOfficialData = officialData || {}
    const {
        name,
        slug,
        records = [],
        total = 0,
        page = 1,
        pageSize = 10,
        lobbyists = [],
        years = [],
        methods = [],
        currentFilters = {},
    } = safeOfficialData

    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    const lobbyistOptions = [
        { value: "", label: "All Lobbyists" },
        ...lobbyists.map((l) => ({ value: l, label: l })),
    ]
    const currentLobbyist =
        lobbyistOptions.find(
            (opt) => opt.value === currentFilters.lobbyistFilter
        ) || lobbyistOptions[0]

    const methodOptions = useMemo(
        () => methods.map((m) => ({ value: m, label: m })),
        [methods]
    )
    const selectedMethods = useMemo(() => {
        if (Array.isArray(currentFilters.methodFilter)) {
            return currentFilters.methodFilter
        } else if (
            typeof currentFilters.methodFilter === "string" &&
            currentFilters.methodFilter
        ) {
            return [currentFilters.methodFilter]
        }
        return []
    }, [currentFilters.methodFilter])
    const selectedMethodOptions = useMemo(
        () =>
            methodOptions.filter((opt) => selectedMethods.includes(opt.value)),
        [methodOptions, selectedMethods]
    )
    const [pendingMethods, setPendingMethods] = useState(selectedMethodOptions)
    useEffect(() => {
        setPendingMethods(selectedMethodOptions)
    }, [selectedMethodOptions])

    if (!officialData) return <div>Official not found</div>

    const handleFilterChange = (filterName, value) => {
        let newQuery = { ...router.query, [filterName]: value, page: 1 }
        if (!value || (Array.isArray(value) && value.length === 0)) {
            delete newQuery[filterName]
        }
        // Special handling for method multi-select: flatten to multiple 'method' keys
        if (filterName === "method" && Array.isArray(value)) {
            // Remove any method or method[] keys
            Object.keys(newQuery).forEach((k) => {
                if (k === "method" || k === "method[]") delete newQuery[k]
            })
            // Next.js router supports passing arrays for repeated query params
            newQuery.method = value
        }
        router.push({ pathname: router.pathname, query: newQuery })
    }

    const handlePageChange = (newPage) => {
        router.push({
            pathname: router.pathname,
            query: { ...router.query, page: newPage },
        })
    }

    return (
        <>
            <Head>
                <title>{`Official - ${name}`}</title>
            </Head>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                {/* Header */}
                <header className="bg-blue-900 dark:bg-gray-800 text-white dark:text-cb-dark-text py-4 shadow">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        {/* Politician Image if available */}
                        <PoliticianImage slug={slug} name={name} />
                        <h1 className="text-4xl font-bold">{name}</h1>
                        <p className="mt-2 text-lg">
                            Total Lobbying Efforts:{" "}
                            <span className="font-semibold">{total}</span>
                        </p>
                        {/* Link to Connections Graph */}
                        <a
                            href={`/connections/${slug}`}
                            className="inline-block mt-4 mx-2 px-4 py-2 bg-green-500 dark:bg-green-800 hover:bg-green-600 text-white dark:text-black  rounded shadow transition"
                        >
                            Connections Graph
                        </a>
                        <a
                            href={`/methods/${slug}`}
                            className="inline-block mt-4 mx-2 px-4 py-2 bg-green-500 dark:bg-green-800 hover:bg-green-600 text-white dark:text-black rounded shadow transition"
                        >
                            Method Pie
                        </a>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-6xl mx-auto px-4 py-8">
                    {/* Filters Bar at Top */}
                    <div className="bg-white dark:bg-gray-800 rounded-md shadow p-4 mb-6 flex flex-col sm:flex-row gap-6 items-center">
                        {/* Lobbyist Filter */}
                        <div className="w-64 accent-blue-600 dark:accent-blue-400">
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Lobbyist
                            </label>
                            <Select
                                options={lobbyistOptions}
                                value={currentLobbyist}
                                onChange={(option) =>
                                    handleFilterChange("lobbyist", option.value)
                                }
                                isSearchable
                                placeholder="Search lobbyists..."
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        backgroundColor: "var(--cb-bg, white)",
                                        color: "var(--cb-text, black)",
                                        borderColor: "#CBD5E0",
                                    }),
                                    menu: (base) => ({
                                        ...base,
                                        backgroundColor: "var(--cb-bg, white)",
                                        color: "var(--cb-text, black)",
                                        zIndex: 9999,
                                    }),
                                }}
                            />
                        </div>

                        {/* Year Filter */}
                        <div className="w-32">
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Year
                            </label>
                            <select
                                value={currentFilters.yearFilter || ""}
                                onChange={(e) =>
                                    handleFilterChange("year", e.target.value)
                                }
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Years</option>
                                {years.map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Method Filter (multi-select, Grafana style: only update on close) */}
                        <div className="w-64 accent-blue-600 dark:accent-blue-400">
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Method
                            </label>
                            <Select
                                options={methodOptions}
                                value={pendingMethods}
                                onChange={setPendingMethods}
                                isMulti
                                isClearable
                                closeMenuOnSelect={false}
                                menuPlacement="auto"
                                placeholder="Select methods..."
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        backgroundColor: "var(--cb-bg, white)",
                                        color: "var(--cb-text, black)",
                                        borderColor: "#CBD5E0",
                                    }),
                                    menu: (base) => ({
                                        ...base,
                                        backgroundColor: "var(--cb-bg, white)",
                                        color: "var(--cb-text, black)",
                                        zIndex: 9999,
                                    }),
                                }}
                                menuPortalTarget={
                                    typeof window !== "undefined"
                                        ? document.body
                                        : undefined
                                }
                                onMenuOpen={() =>
                                    setPendingMethods(selectedMethodOptions)
                                }
                                onMenuClose={() => {
                                    handleFilterChange(
                                        "method",
                                        pendingMethods.map((o) => o.value)
                                    )
                                }}
                            />
                        </div>
                    </div>

                    {/* Lobbying Records Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-md shadow p-4">
                        <h2 className="text-2xl font-semibold mb-4">
                            Lobbying Records (Page {page} of {totalPages})
                        </h2>
                        {records.length > 0 ? (
                            <div className="space-y-4">
                                {records.map((record) => (
                                    <LobbyingCard
                                        key={record.id}
                                        record={record}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600 dark:text-gray-400">
                                No records found.
                            </p>
                        )}

                        {/* Pagination */}
                        <div className="flex flex-wrap items-center gap-2 mt-6">
                            {page > 1 && (
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    className="px-3 py-1 bg-blue-500 text-white rounded"
                                >
                                    ← Prev
                                </button>
                            )}
                            {page > 3 && (
                                <>
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        className="px-3 py-1 bg-blue-500 text-white rounded"
                                    >
                                        1
                                    </button>
                                    {page > 4 && (
                                        <span className="px-2">…</span>
                                    )}
                                </>
                            )}
                            {[...Array(5)].map((_, i) => {
                                const p = page - 2 + i
                                if (p < 1 || p > totalPages) return null
                                return (
                                    <button
                                        key={p}
                                        onClick={() => handlePageChange(p)}
                                        className={`px-3 py-1 rounded ${
                                            p === page
                                                ? "bg-blue-700 font-bold"
                                                : "bg-blue-500 text-white"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            })}
                            {page < totalPages - 2 && (
                                <>
                                    {page < totalPages - 3 && (
                                        <span className="px-2">…</span>
                                    )}
                                    <button
                                        onClick={() =>
                                            handlePageChange(totalPages)
                                        }
                                        className="px-3 py-1 bg-blue-500 text-white rounded"
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                            {page < totalPages && (
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    className="px-3 py-1 bg-blue-500 text-white rounded"
                                >
                                    Next →
                                </button>
                            )}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    const targetPage = parseInt(
                                        e.target.page.value
                                    )
                                    if (
                                        targetPage >= 1 &&
                                        targetPage <= totalPages &&
                                        targetPage !== page
                                    ) {
                                        handlePageChange(targetPage)
                                    }
                                }}
                                className="flex items-center ml-4"
                            >
                                <label className="mr-2">Go to page:</label>
                                <input
                                    type="number"
                                    name="page"
                                    min="1"
                                    max={totalPages}
                                    defaultValue={page}
                                    className="w-16 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="submit"
                                    className="ml-2 px-3 py-1 bg-blue-500 text-white rounded"
                                >
                                    Go
                                </button>
                            </form>
                        </div>
                    </section>
                </main>
            </div>
        </>
    )
}
