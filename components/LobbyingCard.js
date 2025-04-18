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
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-4 shadow-sm bg-white dark:bg-gray-700 text-cb-light-text dark:text-cb-dark-text">
            <h3 className="text-xl font-semibold mb-2">
                <Link
                    href={`/lobbyists/${slugify(lobbyist_name)}`}
                    className="text-blue-700 dark:text-blue-400 hover:underline"
                >
                    {lobbyist_name}
                </Link>
            </h3>

            <p className="italic text-sm mb-2">{formattedDate}</p>

            {intended_results && (
                <p className="mb-2">
                    <strong>Intent:</strong> {intended_results}
                </p>
            )}

            {specific_details && (
                <p className="mb-2">
                    <strong>Details:</strong> {shownDetails}
                    {detailsTooLong && (
                        <>
                            ...{" "}
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-blue-600 dark:text-blue-300 underline focus:outline-none ml-1"
                            >
                                {expanded ? "Show less" : "Read more"}
                            </button>
                        </>
                    )}
                </p>
            )}

            {parsedDPOs.length > 0 && (
                <p className="mb-2">
                    <strong>Officials:</strong>{" "}
                    {parsedDPOs.map((name, i) => (
                        <span key={i}>
                            <Link
                                href={`/officials/${slugify(name)}`}
                                className="underline hover:text-blue-700 dark:hover:text-blue-300"
                            >
                                {name}
                            </Link>
                            {i < parsedDPOs.length - 1 ? ", " : ""}
                        </span>
                    ))}
                </p>
            )}

            {parsedActivities.length > 0 && (
                <p className="mb-2">
                    <strong>Methods:</strong> {parsedActivities.join(", ")}
                </p>
            )}
        </div>
    )
}
