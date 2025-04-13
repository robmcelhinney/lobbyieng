import { useRouter } from "next/router"
import { useState } from "react"
import Select from "react-select"
import LobbyingCard from "../../components/LobbyingCard"

export async function getServerSideProps({ params, query }) {
    if (!params || !params.slug) {
        return { notFound: true }
    }
    const page = parseInt(query?.page || 1)
    const res = await fetch(
        `http://localhost:3000/api/officials/${
            params.slug
        }?${new URLSearchParams(query).toString()}`
    )
    if (!res.ok) {
        return { notFound: true }
    }
    const officialData = await res.json()
    return {
        props: { officialData },
    }
}

export default function OfficialPage({ officialData }) {
    if (!officialData) return <div>Official not found</div>
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
        currentFilters,
    } = officialData

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const router = useRouter()

    const handleFilterChange = (filterName, value) => {
        const newQuery = { ...router.query, [filterName]: value, page: 1 }
        if (!value) delete newQuery[filterName]
        router.push({ pathname: router.pathname, query: newQuery })
    }

    const handlePageChange = (newPage) => {
        router.push({
            pathname: router.pathname,
            query: { ...router.query, page: newPage },
        })
    }

    // Setup react‑select options for the lobbyist filter.
    const lobbyistOptions = [
        { value: "", label: "All Lobbyists" },
        ...lobbyists.map((l) => ({ value: l, label: l })),
    ]
    const currentLobbyist =
        lobbyistOptions.find(
            (opt) => opt.value === currentFilters.lobbyistFilter
        ) || lobbyistOptions[0]

    // For the method filter (plain select)
    const currentMethod = currentFilters.methodFilter || ""

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-blue-900 text-white py-6">
                <div className="max-w-6xl mx-auto px-4">
                    <h1 className="text-4xl font-bold">{name}</h1>
                    <p className="mt-2">
                        Total Lobbying Efforts:{" "}
                        <span className="font-semibold">{total}</span>
                    </p>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Filters Bar at Top */}
                <div className="bg-white rounded-md shadow p-4 mb-6 flex flex-col sm:flex-row gap-6 items-center">
                    {/* Lobbyist Filter */}
                    <div className="w-64">
                        <label className="block mb-1 text-sm font-medium text-gray-700">
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
                                control: (provided) => ({
                                    ...provided,
                                    borderColor: "#CBD5E0",
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

                    {/* Year Filter */}
                    <div className="w-32">
                        <label className="block mb-1 text-sm font-medium text-gray-700">
                            Year
                        </label>
                        <select
                            value={currentFilters.yearFilter || ""}
                            onChange={(e) =>
                                handleFilterChange("year", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Years</option>
                            {years.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Method Filter */}
                    <div className="w-40">
                        <label className="block mb-1 text-sm font-medium text-gray-700">
                            Method
                        </label>
                        <select
                            value={currentMethod}
                            onChange={(e) =>
                                handleFilterChange("method", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Methods</option>
                            {methods.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Lobbying Records Section */}
                <section className="bg-white rounded-md shadow p-4">
                    <h2 className="text-2xl font-semibold mb-4">
                        Lobbying Records (Page {page} of {totalPages})
                    </h2>
                    {records.length > 0 ? (
                        <div className="space-y-4">
                            {records.map((record) => (
                                <LobbyingCard key={record.id} record={record} />
                            ))}
                        </div>
                    ) : (
                        <p>No records found.</p>
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
                                {page > 4 && <span className="px-2">…</span>}
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
                                    onClick={() => handlePageChange(totalPages)}
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
                                const targetPage = parseInt(e.target.page.value)
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
                                className="w-16 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    )
}
