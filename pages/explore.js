import { useEffect, useMemo, useState } from "react"
import Head from "next/head"
import Link from "next/link"
import { Bar } from "react-chartjs-2"
import { BarElement, CategoryScale, Chart, Legend, LinearScale, Tooltip } from "chart.js"

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

function formatCount(value) {
  return new Intl.NumberFormat("en-US").format(value || 0)
}

function truncateLabel(label, max = 30) {
  if (!label) return ""
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}…`
}

function SegmentTabs({ tabs, active, onChange }) {
  return (
    <div className="inline-flex rounded-md border border-[var(--ui-border)] p-1 bg-white/70 dark:bg-slate-900/20">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`px-2.5 py-1.5 text-xs sm:text-sm rounded-md font-semibold transition ${
            active === tab.key
              ? "bg-[color:var(--ui-primary)] text-white"
              : "text-[color:var(--ui-muted)] hover:bg-slate-200/70 dark:hover:bg-slate-700/50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function SectionCard({ title, subtitle, controls, children }) {
  return (
    <section className="surface-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="text-sm text-muted-ui mt-1">{subtitle}</p> : null}
        </div>
        {controls}
      </div>
      {children}
    </section>
  )
}

function RankList({ items, valueKey, nameKey = "name", linkPrefix, emptyLabel = "No data found.", loading = false }) {
  const [mode, setMode] = useState("top10")
  const [visibleCount, setVisibleCount] = useState(10)

  useEffect(() => {
    setMode("top10")
    setVisibleCount(10)
  }, [items, valueKey, nameKey])

  if (loading) {
    return <p className="text-sm text-muted-ui">Loading data...</p>
  }

  if (!items?.length) {
    return <p className="text-sm text-muted-ui">{emptyLabel}</p>
  }

  const hasOverflow = items.length > 10
  const shownItems = mode === "all" ? items : items.slice(0, visibleCount)
  const canShowMore = mode === "top10" && visibleCount < items.length

  return (
    <div>
      {hasOverflow ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <SegmentTabs
            tabs={[
              { key: "top10", label: "Top 10" },
              { key: "all", label: `Top ${items.length}` }
            ]}
            active={mode}
            onChange={(nextMode) => {
              setMode(nextMode)
              if (nextMode === "top10") setVisibleCount(10)
            }}
          />
          <span className="text-xs text-muted-ui">{formatCount(items.length)} rows returned</span>
        </div>
      ) : null}

      <ol className="space-y-2">
        {shownItems.map((row, idx) => (
          <li
            key={`${row[nameKey]}-${idx}`}
            className="flex items-center justify-between gap-3 border border-[var(--ui-border)] rounded px-3 py-2 bg-white/60 dark:bg-slate-900/20"
          >
            <div className="min-w-0">
              <span className="text-xs font-semibold text-muted-ui mr-2">#{idx + 1}</span>
              {linkPrefix ? (
                <Link href={`${linkPrefix}/${row.slug}`} className="font-medium hover:underline break-words">
                  {row[nameKey]}
                </Link>
              ) : (
                <span className="font-medium break-words">{row[nameKey]}</span>
              )}
            </div>
            <span className="text-sm font-semibold text-[color:var(--ui-primary)]">{formatCount(row[valueKey])}</span>
          </li>
        ))}
      </ol>

      {canShowMore ? (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => Math.min(count + 10, items.length))}
            className="px-3 py-1.5 rounded-md border border-[var(--ui-border)] text-sm font-semibold hover:bg-slate-100/70 dark:hover:bg-slate-700/40"
          >
            Show more
          </button>
        </div>
      ) : null}
    </div>
  )
}

function CompactBarChart({ items, valueKey, nameKey = "name", title, type = "neutral" }) {
  const top = (items || []).slice(0, 10)
  if (!top.length) return null

  const backgroundColor =
    type === "delta"
      ? top.map((row) => (row[valueKey] >= 0 ? "rgba(34, 197, 94, 0.84)" : "rgba(239, 68, 68, 0.84)"))
      : "rgba(31, 78, 179, 0.84)"

  const chartData = {
    labels: top.map((row) => truncateLabel(String(row[nameKey]))),
    datasets: [
      {
        label: title,
        data: top.map((row) => row[valueKey]),
        backgroundColor,
        borderRadius: 5
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: type !== "delta", ticks: { precision: 0 } },
      y: { ticks: { font: { size: 11 } } }
    }
  }

  return (
    <div className="mt-4 h-64">
      <Bar data={chartData} options={options} />
    </div>
  )
}

export default function ExplorePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [searchInFlightTerm, setSearchInFlightTerm] = useState("")

  const [officialContactView, setOfficialContactView] = useState("latest")
  const [lobbyistActivityView, setLobbyistActivityView] = useState("latest")
  const [moversView, setMoversView] = useState("officials")
  const [centralityView, setCentralityView] = useState("officials")

  const fetchInsights = async (term = "") => {
    setLoading(true)
    setError("")
    try {
      const query = term ? `?q=${encodeURIComponent(term)}` : ""
      const res = await fetch(`/api/explore/insights${query}`)
      if (!res.ok) throw new Error("Failed to load exploration insights")
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message || "Failed to load exploration insights")
    } finally {
      setSearchInFlightTerm("")
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  const latestPeriod = data?.latest_period
  const previousPeriod = data?.previous_period

  const searchSummary = useMemo(() => {
    if (!searchTerm) return ""
    const count = data?.search_results?.length || 0
    return `${count} results for "${searchTerm}"`
  }, [searchTerm, data?.search_results])

  const officialContactItems =
    officialContactView === "latest" ? data?.top_targets_latest || [] : data?.top_targets_last_year || []
  const lobbyistActivityItems =
    lobbyistActivityView === "latest" ? data?.top_lobbyists_latest || [] : data?.most_active_lobbyists || []
  const moversItems =
    moversView === "officials" ? data?.biggest_mover_officials || [] : data?.biggest_mover_lobbyists || []
  const centralityItems =
    centralityView === "officials" ? data?.official_centrality_latest || [] : data?.lobbyist_centrality_latest || []
  const centralityLinkPrefix = centralityView === "officials" ? "/officials" : "/lobbyists"
  const moversLinkPrefix = moversView === "officials" ? "/officials" : "/lobbyists"

  return (
    <>
      <Head>
        <title>Lobbyieng - Explore Insights</title>
      </Head>
      <div className="min-h-screen">
        {loading ? (
          <div className="w-full h-1 bg-blue-200 dark:bg-blue-900">
            <div className="h-1 bg-blue-600 dark:bg-blue-400 animate-pulse w-full"></div>
          </div>
        ) : null}

        <section className="hero-shell">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <h1 className="hero-title">Explore Insights</h1>
            <p className="hero-subtitle mt-3 max-w-3xl">
              Fast comparative views for volume, momentum, topics, and network structure across lobbying returns.
            </p>
            <div className="mt-4 text-sm text-blue-100">
              Latest period: <strong>{latestPeriod || "Unknown"}</strong>
              {previousPeriod ? (
                <>
                  {" "}
                  | Previous period: <strong>{previousPeriod}</strong>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <SectionCard
            title="Return Text Search"
            subtitle="Subject, intended results, and details fields. Useful for ad-hoc topic exploration."
          >
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                const next = searchInput.trim()
                setSearchTerm(next)
                setSearchInFlightTerm(next)
                setData((prev) => (prev ? { ...prev, search_results: [] } : prev))
                fetchInsights(next)
              }}
            >
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Try: housing, alcohol bill, public transport..."
                className="flex-1 rounded-md border border-[var(--ui-border)] px-3 py-2 bg-white dark:bg-slate-900/20"
              />
              <button type="submit" className="px-4 py-2 rounded-md bg-[color:var(--ui-primary)] text-white font-semibold">
                Search
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-[var(--ui-border)] font-semibold hover:bg-slate-100/70 dark:hover:bg-slate-700/40"
                onClick={() => {
                  setSearchInput("")
                  setSearchTerm("")
                  setSearchInFlightTerm("")
                  fetchInsights("")
                }}
              >
                Clear
              </button>
            </form>
            {searchSummary ? <p className="text-sm mt-3 text-muted-ui">{searchSummary}</p> : null}
            {searchInFlightTerm ? (
              <div className="mt-4">
                <div className="w-full h-1 bg-blue-200 dark:bg-blue-900 rounded">
                  <div className="h-1 bg-blue-600 dark:bg-blue-400 animate-pulse w-full rounded"></div>
                </div>
                <p className="mt-2 text-sm text-muted-ui">Searching for &quot;{searchInFlightTerm}&quot;...</p>
              </div>
            ) : null}
            {!searchInFlightTerm && searchTerm && data?.search_results?.length ? (
              <ul className="mt-4 space-y-2">
                {data.search_results.map((row) => (
                  <li key={row.id} className="border border-[var(--ui-border)] rounded-md px-3 py-2 bg-white/60 dark:bg-slate-900/20">
                    <div className="text-sm text-muted-ui">
                      {row.period || "Unknown period"} | {row.date_published || "Unknown date"}
                    </div>
                    <div className="font-medium">
                      {row.lobbyist_slug ? (
                        <Link href={`/lobbyists/${row.lobbyist_slug}`} className="hover:underline">
                          {row.lobbyist_name || "Unknown lobbyist"}
                        </Link>
                      ) : (
                        row.lobbyist_name || "Unknown lobbyist"
                      )}
                    </div>
                    <p className="text-sm mt-1">{row.subject_matter || row.intended_results || "No summary text"}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </SectionCard>

          {error ? (
            <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/40 p-4 text-red-700 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              title="Most Contacted Officials"
              subtitle={officialContactView === "latest" ? latestPeriod || "" : "Rolling last 12 months"}
              controls={
                <SegmentTabs
                  tabs={[
                    { key: "latest", label: "Latest period" },
                    { key: "year", label: "Last 12 months" }
                  ]}
                  active={officialContactView}
                  onChange={setOfficialContactView}
                />
              }
            >
              <RankList items={officialContactItems} valueKey="contact_count" linkPrefix="/officials" loading={loading} />
              <CompactBarChart items={officialContactItems} valueKey="contact_count" title="Contact count" />
            </SectionCard>

            <SectionCard
              title="Lobbyist Activity"
              subtitle={lobbyistActivityView === "latest" ? latestPeriod || "" : "All periods"}
              controls={
                <SegmentTabs
                  tabs={[
                    { key: "latest", label: "Latest period" },
                    { key: "all", label: "All-time" }
                  ]}
                  active={lobbyistActivityView}
                  onChange={setLobbyistActivityView}
                />
              }
            >
              <RankList items={lobbyistActivityItems} valueKey="return_count" linkPrefix="/lobbyists" loading={loading} />
              <CompactBarChart items={lobbyistActivityItems} valueKey="return_count" title="Return count" />
            </SectionCard>

            <SectionCard
              title="Biggest Movers"
              subtitle={previousPeriod ? `${previousPeriod} → ${latestPeriod}` : "Delta from previous period"}
              controls={
                <SegmentTabs
                  tabs={[
                    { key: "officials", label: "Officials" },
                    { key: "lobbyists", label: "Lobbyists" }
                  ]}
                  active={moversView}
                  onChange={setMoversView}
                />
              }
            >
              <RankList items={moversItems} valueKey="delta" linkPrefix={moversLinkPrefix} loading={loading} />
              <CompactBarChart items={moversItems} valueKey="delta" title="Delta" type="delta" />
            </SectionCard>

            <SectionCard
              title="Network Centrality"
              subtitle="Unique counterpart count (degree centrality)"
              controls={
                <SegmentTabs
                  tabs={[
                    { key: "officials", label: "Officials" },
                    { key: "lobbyists", label: "Lobbyists" }
                  ]}
                  active={centralityView}
                  onChange={setCentralityView}
                />
              }
            >
              <RankList items={centralityItems} valueKey="degree" linkPrefix={centralityLinkPrefix} loading={loading} />
              <CompactBarChart items={centralityItems} valueKey="degree" title="Degree" />
            </SectionCard>

            <SectionCard title="Top Policy Areas" subtitle={latestPeriod || ""}>
              <RankList
                items={data?.top_policy_areas_latest || []}
                valueKey="return_count"
                linkPrefix={null}
                loading={loading}
              />
              <CompactBarChart items={data?.top_policy_areas_latest || []} valueKey="return_count" title="Return count" />
            </SectionCard>

            <SectionCard title="Top Keywords" subtitle="Simple tokenization and stemming">
              <RankList
                items={data?.top_keywords_latest || []}
                valueKey="count"
                nameKey="token"
                linkPrefix={null}
                loading={loading}
              />
              <CompactBarChart items={data?.top_keywords_latest || []} valueKey="count" nameKey="token" title="Token count" />
            </SectionCard>
          </div>

          <SectionCard title="Shared Lobbyists Between Officials" subtitle={latestPeriod || ""}>
            {loading ? (
              <p className="text-sm text-muted-ui">Loading data...</p>
            ) : data?.shared_lobbyists_latest?.length ? (
              <ul className="space-y-2">
                {data.shared_lobbyists_latest.map((row, idx) => (
                  <li
                    key={`${row.official_a}-${row.official_b}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-[var(--ui-border)] rounded-md px-3 py-2 bg-white/60 dark:bg-slate-900/20"
                  >
                    <div className="text-sm">
                      <Link href={`/officials/${row.official_a_slug}`} className="font-medium hover:underline">
                        {row.official_a}
                      </Link>
                      <span className="mx-2 text-muted-ui">and</span>
                      <Link href={`/officials/${row.official_b_slug}`} className="font-medium hover:underline">
                        {row.official_b}
                      </Link>
                    </div>
                    <div className="text-sm font-semibold text-[color:var(--ui-primary)]">
                      {formatCount(row.shared_lobbyists)} shared lobbyists
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-ui">No shared lobbyist pairs found.</p>
            )}
          </SectionCard>
        </main>
      </div>
    </>
  )
}
