import React from "react"

function parseDetailsAndMethods(details) {
    if (!details) return []
    return details.split(/,(?![^|]*\|)/).map((entry) => {
        const parts = entry.split("|").map((s) => s.trim())
        return {
            description: parts[0] || "",
            method: parts[1] || null,
            count: parts[2] || null,
        }
    })
}

function extractMethodFromActivity(activity) {
    if (!activity) return null
    const parts = activity.split("|")
    return parts.length > 1 ? parts[1].trim() : null
}

export default function LobbyingCardLobbyist({ record }) {
    const date = record.date_published
        ? record.date_published.slice(0, 10)
        : "Unknown"
    const politicians =
        record.dpo_entries && record.dpo_entries.length > 0
            ? record.dpo_entries.map((dpo, i) => (
                  <span key={i}>
                      {dpo.person_name}
                      {dpo.job_title ? ` (${dpo.job_title})` : ""}
                      {dpo.public_body ? `, ${dpo.public_body}` : ""}
                      {i < record.dpo_entries.length - 1 ? "; " : ""}
                  </span>
              ))
            : [<span key="none">Unknown</span>]

    const intent = record.intended_results || "Unknown"
    const details = record.specific_details || "Unknown"
    const parsed = parseDetailsAndMethods(details)

    const methods = (record.lobbying_activities || [])
        .map(extractMethodFromActivity)
        .filter(Boolean)
    const uniqueMethods = Array.from(new Set(methods))

    return (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-4 shadow-sm bg-white dark:bg-gray-700 text-cb-light-text dark:text-cb-dark-text">
            <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                {date}
            </div>
            <div className="mb-2">
                <span className="font-semibold">Politician(s) lobbied: </span>
                {politicians}
            </div>
            <div className="mb-2">
                <span className="font-semibold">Intent: </span>
                {intent}
            </div>
            <div className="mb-2">
                <span className="font-semibold">Methods: </span>
                {uniqueMethods.length > 0 ? (
                    uniqueMethods.join(", ")
                ) : (
                    <span className="text-gray-400">Unknown</span>
                )}
            </div>
            <div className="mb-2">
                <span className="font-semibold">Details & Methods:</span>
                <table className="min-w-full text-sm mt-2 border-separate border-spacing-y-1">
                    <thead>
                        <tr>
                            <th className="text-left pr-4 text-cb-light-text dark:text-cb-dark-text">
                                Method
                            </th>
                            <th className="text-left text-cb-light-text dark:text-cb-dark-text">
                                Description
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {parsed.length > 0 ? (
                            parsed.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="pr-4 font-medium text-blue-900 dark:text-blue-300">
                                        {item.method || (
                                            <span className="text-gray-400 dark:text-gray-500">
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-cb-light-text dark:text-cb-dark-text">
                                        {item.description}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={2}>Unknown</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
