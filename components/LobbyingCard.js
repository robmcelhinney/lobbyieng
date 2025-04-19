import { useState } from "react"
import Link from "next/link"

export default function LobbyingCard({ record }) {
    const {
        lobbyist_name,
        date_published,
        specific_details,
        intended_results,
        dpo_entries = [],
        lobbying_activities = [],
        isFormerDPO,
        url,
    } = record

    const [expanded, setExpanded] = useState(false)

    const formattedDate = date_published?.slice(0, 10) || "Unknown"
    const detailsTooLong = specific_details?.length > 300
    const shownDetails = expanded
        ? specific_details
        : specific_details?.slice(0, 300)

    // Derive official names from dpo_entries
    const parsedDPOs = Array.isArray(dpo_entries)
        ? dpo_entries.map((d) => d.person_name).filter(Boolean)
        : []

    // Show less / read more for Officials
    const [officialsExpanded, setOfficialsExpanded] = useState(false)
    const officialsLimit = 8
    const shownOfficials = officialsExpanded
        ? parsedDPOs
        : parsedDPOs.slice(0, officialsLimit)
    const hasMoreOfficials = parsedDPOs.length > officialsLimit

    const parsedActivities = Array.isArray(lobbying_activities)
        ? lobbying_activities.filter(Boolean)
        : []

    // Show less / read more for Methods
    const [methodsExpanded, setMethodsExpanded] = useState(false)
    const methodsLimit = 3
    const shownMethods = methodsExpanded
        ? parsedActivities
        : parsedActivities.slice(0, methodsLimit)
    const hasMoreMethods = parsedActivities.length > methodsLimit

    const slugify = (name) =>
        name
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .trim()
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

            {isFormerDPO && (
                <>
                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full dark:bg-red-900 dark:text-red-200">
                        Current/Former DPO
                    </span>
                    <a
                        href="https://www.lobbying.ie/help-resources/frequently-asked-questions/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-500 hover:underline text-xs"
                    >
                        What is lobbying? (FAQ)
                    </a>
                </>
            )}

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
                            {expanded ? ". " : ", ... "}
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
                    {shownOfficials.map((name, i) => (
                        <span key={i}>
                            <Link
                                href={`/officials/${slugify(name)}`}
                                className="underline hover:text-blue-700 dark:hover:text-blue-300"
                            >
                                {name}
                            </Link>
                            {i < shownOfficials.length - 1 ? ", " : ""}
                        </span>
                    ))}
                    {hasMoreOfficials && (
                        <>
                            {officialsExpanded ? ". " : ", ... "}
                            <button
                                onClick={() =>
                                    setOfficialsExpanded(!officialsExpanded)
                                }
                                className="text-blue-600 dark:text-blue-300 underline focus:outline-none ml-1"
                            >
                                {officialsExpanded ? "Show less" : "Read more"}
                            </button>
                        </>
                    )}
                </p>
            )}

            {parsedActivities.length > 0 && (
                <p className="mb-2">
                    <strong>Methods:</strong> {shownMethods.join(", ")}
                    {hasMoreMethods && (
                        <>
                            {methodsExpanded ? ". " : ", ... "}
                            <button
                                onClick={() =>
                                    setMethodsExpanded(!methodsExpanded)
                                }
                                className="text-blue-600 dark:text-blue-300 underline focus:outline-none ml-1"
                            >
                                {methodsExpanded ? "Show less" : "Read more"}
                            </button>
                        </>
                    )}
                </p>
            )}

            <div className="mt-2">
                <a
                    href={`https://${url}`}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View Full Record
                </a>
            </div>
        </div>
    )
}
