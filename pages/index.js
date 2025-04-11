import { useState } from "react"
import Link from "next/link"

export async function getServerSideProps() {
    try {
        const res = await fetch("http://localhost:3000/api/officials")
        if (!res.ok) throw new Error("API failed")
        const officials = await res.json()
        return { props: { officials } }
    } catch (err) {
        console.error("Error fetching officials:", err)
        return { props: { officials: [] } }
    }
}

const DEFAULT_TITLES = ["TD", "An Taoiseach", "An Tánaiste"]

export default function Index({ officials }) {
    const [selectedTitles, setSelectedTitles] = useState(
        new Set(DEFAULT_TITLES)
    )
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [searchInput, setSearchInput] = useState("")
    const allPeriods = Array.from(
        new Set(officials.flatMap((o) => o.periods))
    ).sort()
    const [selectedPeriod, setSelectedPeriod] = useState("")

    const toggleTitle = (title) => {
        const updated = new Set(selectedTitles)
        updated.has(title) ? updated.delete(title) : updated.add(title)
        setSelectedTitles(updated)
    }

    const uniqueTitles = [...new Set(officials.map((o) => o.job_title))]
        .filter(Boolean)
        .sort()

    const filteredTitles = uniqueTitles.filter((title) =>
        title.toLowerCase().includes(searchInput.toLowerCase())
    )

    const filtered = officials.filter(
        (o) =>
            [...selectedTitles].some((title) => o.job_title.includes(title)) &&
            (!selectedPeriod || o.periods.includes(selectedPeriod))
    )

    return (
        <div style={{ padding: "2rem" }}>
            <h1>Elected Officials – Lobbying Data</h1>

            <div style={{ position: "relative", marginBottom: "1rem" }}>
                <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{
                        padding: "0.5rem",
                        border: "1px solid #ccc",
                        background: "#fff",
                        borderRadius: "4px",
                        minWidth: "200px",
                        textAlign: "left",
                    }}
                >
                    {selectedTitles.size
                        ? [...selectedTitles].join(", ")
                        : "Filter by Job Title"}
                </button>

                {dropdownOpen && (
                    <div
                        style={{
                            position: "absolute",
                            top: "110%",
                            left: 0,
                            background: "#fff",
                            border: "1px solid #ccc",
                            padding: "0.5rem",
                            borderRadius: "4px",
                            maxHeight: "300px",
                            overflowY: "auto",
                            zIndex: 10,
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Search titles..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            style={{
                                width: "100%",
                                marginBottom: "0.5rem",
                                padding: "0.25rem",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                            }}
                        />
                        {filteredTitles.map((title) => (
                            <label
                                key={title}
                                style={{
                                    display: "block",
                                    marginBottom: "0.25rem",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedTitles.has(title)}
                                    onChange={() => toggleTitle(title)}
                                />{" "}
                                {title}
                            </label>
                        ))}
                        {filteredTitles.length === 0 && (
                            <div style={{ color: "#888" }}>No matches</div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ marginBottom: "1rem" }}>
                <label>
                    <strong>Filter by Time Period: </strong>
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        style={{ marginLeft: "0.5rem", padding: "0.25rem" }}
                    >
                        <option value="">All Periods</option>
                        {allPeriods.map((period) => (
                            <option key={period} value={period}>
                                {period}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <ul>
                {filtered.map((official) => (
                    <li key={official.slug}>
                        <Link
                            legacyBehavior
                            href={`/officials/${official.slug}`}
                        >
                            <a>
                                {official.name} – <em>{official.job_title}</em>
                            </a>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}
