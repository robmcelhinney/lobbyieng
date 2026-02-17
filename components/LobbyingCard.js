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
    url
  } = record

  const [expanded, setExpanded] = useState(false)

  const formattedDate = date_published?.slice(0, 10) || "Unknown"
  const detailsTooLong = specific_details?.length > 300
  const shownDetails = expanded ? specific_details : specific_details?.slice(0, 300)

  // Derive official names from dpo_entries
  const parsedDPOs = Array.isArray(dpo_entries) ? dpo_entries.map((d) => d.person_name).filter(Boolean) : []

  // Show less / read more for Officials
  const [officialsExpanded, setOfficialsExpanded] = useState(false)
  const officialsLimit = 8
  const shownOfficials = officialsExpanded ? parsedDPOs : parsedDPOs.slice(0, officialsLimit)
  const hasMoreOfficials = parsedDPOs.length > officialsLimit

  const parsedActivities = Array.isArray(lobbying_activities) ? lobbying_activities.filter(Boolean) : []

  // Show less / read more for Methods
  const [methodsExpanded, setMethodsExpanded] = useState(false)
  const methodsLimit = 3
  const shownMethods = methodsExpanded ? parsedActivities : parsedActivities.slice(0, methodsLimit)
  const hasMoreMethods = parsedActivities.length > methodsLimit

  const slugify = (name) =>
    name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")

  return (
    <article className="surface-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-xl font-semibold tracking-tight">
          <Link href={`/lobbyists/${slugify(lobbyist_name)}`} className="hover:underline">
            {lobbyist_name}
          </Link>
        </h3>
        <div className="text-xs md:text-sm text-muted-ui">{formattedDate}</div>
      </div>

      {isFormerDPO && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/45 dark:text-red-200">
            Current/Former DPO
          </span>
          <a
            href="https://www.lobbying.ie/help-resources/frequently-asked-questions/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold hover:underline"
          >
            FAQ
          </a>
        </div>
      )}

      {intended_results && (
        <p className="mt-3 text-sm leading-6">
          <span className="font-semibold">Intent:</span> {intended_results}
        </p>
      )}

      {specific_details && (
        <p className="mt-2 text-sm leading-6 text-muted-ui">
          <span className="font-semibold text-[color:var(--ui-text)]">Details:</span> {shownDetails}
          {detailsTooLong && (
            <>
              {expanded ? ". " : ", ... "}
              <button onClick={() => setExpanded(!expanded)} className="underline ml-1 font-semibold">
                {expanded ? "Show less" : "Read more"}
              </button>
            </>
          )}
        </p>
      )}

      {parsedDPOs.length > 0 && (
        <div className="mt-3">
          <div className="text-sm font-semibold mb-2">Officials</div>
          <div className="flex flex-wrap gap-2">
            {shownOfficials.map((officialName, i) => (
              <Link
                key={`${officialName}-${i}`}
                href={`/officials/${slugify(officialName)}`}
                className="text-xs md:text-sm px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-white/80 dark:bg-slate-900/35 hover:underline no-underline"
              >
                {officialName}
              </Link>
            ))}
          </div>
          {hasMoreOfficials && (
            <button onClick={() => setOfficialsExpanded(!officialsExpanded)} className="mt-2 text-sm underline font-semibold">
              {officialsExpanded ? "Show fewer officials" : "Show all officials"}
            </button>
          )}
        </div>
      )}

      {parsedActivities.length > 0 && (
        <div className="mt-3">
          <div className="text-sm font-semibold mb-2">Methods</div>
          <div className="flex flex-wrap gap-2">
            {shownMethods.map((method, idx) => (
              <span
                key={`${method}-${idx}`}
                className="text-xs md:text-sm px-2.5 py-1 rounded-full bg-[color:var(--ui-bg-soft)] text-[color:var(--ui-text)]"
              >
                {method}
              </span>
            ))}
          </div>
          {hasMoreMethods && (
            <button onClick={() => setMethodsExpanded(!methodsExpanded)} className="mt-2 text-sm underline font-semibold">
              {methodsExpanded ? "Show fewer methods" : "Show all methods"}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[var(--ui-border)]">
        <a href={`https://${url}`} className="font-semibold hover:underline" target="_blank" rel="noopener noreferrer">
          View full record
        </a>
      </div>
    </article>
  )
}
