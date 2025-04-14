import { useState } from "react"
import Select from "react-select"
import Head from "next/head"
import Link from "next/link"

export async function getServerSideProps() {
    try {
        const res = await fetch("http://localhost:3000/api/lobbyists")
        if (!res.ok) throw new Error("API failed")
        const lobbyists = await res.json()
        return { props: { lobbyists } }
    } catch (err) {
        console.error("Error fetching lobbyists:", err)
        return { props: { lobbyists: [] } }
    }
}

// Utility function to match API slugify
function slugify(name) {
    return name
        .normalize("NFD")
        .replace(/[^\p{L}\p{N}]+/gu, "-") // Replace non-alphanumeric (unicode) with dash
        .replace(/-+/g, "-") // Collapse multiple dashes
        .replace(/^-|-$/g, "") // Trim leading/trailing dashes
        .toLowerCase()
}

export default function LobbyistsPage({ lobbyists }) {
    const [selectedName, setSelectedName] = useState(null)

    // Filtered list
    const filtered = selectedName
        ? lobbyists.filter((l) => l.name === selectedName.value)
        : lobbyists

    // react-select options
    const nameOptions = lobbyists.map((l) => ({ value: l.name, label: l.name }))

    return (
        <>
            <Head>
                <title>Lobbyieng – Lobbyists</title>
            </Head>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-blue-900 text-white py-4 shadow">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <h1 className="text-4xl font-bold">Lobbyists</h1>
                        <p className="mt-2 text-lg">
                            Browse all registered lobbyists.
                        </p>
                    </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 py-8">
                    <div className="bg-white rounded-md shadow p-4 mb-6 flex flex-col sm:flex-row gap-6 items-center">
                        <div className="w-64">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                            </label>
                            <Select
                                options={nameOptions}
                                value={selectedName}
                                onChange={setSelectedName}
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
                        {selectedName && (
                            <div>
                                <button
                                    onClick={() => setSelectedName(null)}
                                    className="text-red-600 underline text-sm"
                                >
                                    Clear Filter
                                </button>
                            </div>
                        )}
                    </div>
                    <section className="bg-white rounded-md shadow p-6">
                        <h2 className="text-2xl font-semibold mb-4">
                            Lobbyists ({filtered.length} results)
                        </h2>
                        {filtered.length > 0 ? (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {filtered.map((lobbyist) => (
                                    <li
                                        key={lobbyist.slug}
                                        className="border rounded-md p-4 hover:shadow transition"
                                    >
                                        <Link
                                            legacyBehavior
                                            href={`/lobbyists/${slugify(
                                                lobbyist.name
                                            )}`}
                                        >
                                            <a>
                                                <h3 className="font-bold text-gray-900">
                                                    {lobbyist.name}
                                                </h3>
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
