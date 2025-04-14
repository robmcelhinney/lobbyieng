import { useState } from "react"
import Link from "next/link"

export default function LobbyingCard({ record }) {
    const {
        lobbying_activities = [],
        lobbyist_name,
        date_published,
        specific_details,
        intended_results,
        dpos_lobbied,
    } = record

    const [expanded, setExpanded] = useState(false)

    const formattedDate = date_published?.slice(0, 10) || "Unknown"
    const detailsTooLong = specific_details?.length > 300
    const shownDetails = expanded
        ? specific_details
        : specific_details?.slice(0, 300)

    const parsedDPOs = (dpos_lobbied || "")
        .split("::")
        .map((entry) => entry.split("|")[0]?.trim())
        .filter(Boolean)

    const parsedActivities = Array.isArray(lobbying_activities)
        ? lobbying_activities.filter(Boolean)
        : []

    const slugify = (name) =>
        name
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .replace(/\s+/g, "-")

    return (
        <div
            style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                background: "#fff",
            }}
        >
            <h3 style={{ marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                <Link
                    href={`/lobbyists/${slugify(lobbyist_name)}`}
                    className="text-blue-700 underline hover:text-blue-900 transition-colors"
                >
                    {lobbyist_name}
                </Link>
            </h3>
            <p style={{ fontStyle: "italic", marginBottom: "0.5rem" }}>
                {formattedDate}
            </p>

            {intended_results && (
                <p style={{ marginBottom: "0.5rem" }}>
                    <strong>Intent:</strong> {intended_results}
                </p>
            )}

            {specific_details && (
                <p style={{ marginBottom: "0.5rem" }}>
                    <strong>Details:</strong> {shownDetails}
                    {detailsTooLong && (
                        <>
                            ...{" "}
                            <button
                                onClick={() => setExpanded(!expanded)}
                                style={{
                                    border: "none",
                                    background: "none",
                                    color: "blue",
                                    cursor: "pointer",
                                    padding: 0,
                                }}
                            >
                                {expanded ? "Show less" : "Read more"}
                            </button>
                        </>
                    )}
                </p>
            )}

            {parsedDPOs.length > 0 && (
                <p style={{ marginBottom: "0.5rem" }}>
                    <strong>Officials:</strong>{" "}
                    {parsedDPOs.map((name, i) => (
                        <span key={i}>
                            <Link href={`/officials/${slugify(name)}`}>
                                {name}
                            </Link>
                            {i < parsedDPOs.length - 1 ? ", " : ""}
                        </span>
                    ))}
                </p>
            )}

            {parsedActivities.length > 0 && (
                <p style={{ marginBottom: "0.5rem" }}>
                    <strong>Methods:</strong> {parsedActivities.join(", ")}
                </p>
            )}
        </div>
    )
}
