import React from "react"

function parseDetailsAndMethods(details) {
  if (!details) return []
  return details.split(/,(?![^|]*\|)/).map((entry) => {
    const parts = entry.split("|").map((s) => s.trim())
    return {
      description: parts[0] || "",
      method: parts[1] || null,
      count: parts[2] || null
    }
  })
}

function extractMethodFromActivity(activity) {
  if (!activity) return null
  const parts = activity.split("|")
  return parts.length > 1 ? parts[1].trim() : null
}

export default function LobbyingCardLobbyist({ record }) {
  const date = record.date_published ? record.date_published.slice(0, 10) : "Unknown"
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

  const methods = (record.lobbying_activities || []).map(extractMethodFromActivity).filter(Boolean)
  const uniqueMethods = Array.from(new Set(methods))

  // Show Former DPO badge if isFormerDPO is true
  const isFormerDPO = record.isFormerDPO

  return (
    <article className="surface-card">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="text-xs md:text-sm text-muted-ui">{date}</div>

        {isFormerDPO && (
          <div className="flex items-center gap-2">
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
      </div>
      <div className="mb-2 text-sm leading-6">
        <span className="font-semibold">Politician(s) lobbied:</span> {politicians}
      </div>
      <div className="mb-2 text-sm leading-6">
        <span className="font-semibold">Intent:</span> {intent}
      </div>
      <div className="mb-2 text-sm leading-6">
        <span className="font-semibold">Methods:</span>{" "}
        {uniqueMethods.length > 0 ? (
          <span className="inline-flex flex-wrap gap-2 align-middle">
            {uniqueMethods.map((method) => (
              <span
                key={method}
                className="text-xs md:text-sm px-2.5 py-1 rounded-full bg-[color:var(--ui-bg-soft)] text-[color:var(--ui-text)]"
              >
                {method}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-muted-ui">Unknown</span>
        )}
      </div>
      <div className="mb-2">
        <div className="text-sm font-semibold mb-2">Details by Method</div>
        <div className="space-y-2">
          {parsed.length > 0 ? (
            parsed.map((item, idx) => (
              <div
                key={idx}
                className="rounded-md border border-[var(--ui-border)] bg-white/80 dark:bg-slate-900/35 px-3 py-2"
              >
                <div className="text-xs uppercase tracking-wide text-muted-ui mb-1">
                  {item.method || "Method not specified"}
                </div>
                <div className="text-sm leading-6">{item.description || "No description"}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-ui">Unknown</div>
          )}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--ui-border)]">
        <a href={`https://${record.url}`} className="font-semibold hover:underline" target="_blank" rel="noopener noreferrer">
          View full record
        </a>
      </div>
    </article>
  )
}
