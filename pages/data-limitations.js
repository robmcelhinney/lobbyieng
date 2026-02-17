import Head from "next/head"
import { getDataMetadata } from "../lib/dataMetadata"

function formatDate(value) {
  if (!value) return "Unavailable"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unavailable"
  return date.toLocaleDateString("en-IE", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })
}

function formatNumber(value) {
  if (typeof value !== "number") return "Unavailable"
  return new Intl.NumberFormat("en-IE").format(value)
}

export async function getServerSideProps() {
  try {
    const metadata = await getDataMetadata()
    return { props: { metadata } }
  } catch (error) {
    return {
      props: {
        metadata: null,
        fetchError: error.message
      }
    }
  }
}

export default function DataLimitationsPage({ metadata, fetchError }) {
  const summary = metadata?.summary || {}
  const coverage = metadata?.coverage || {}
  const freshness = metadata?.freshness || {}

  return (
    <>
      <Head>
        <title>Lobbyieng - Data & Limitations</title>
        <meta
          name="description"
          content="Understand Lobbyieng data coverage, update cadence, and known limitations for Irish lobbying records."
        />
      </Head>
      <main className="min-h-screen">
        <section className="hero-shell">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Data & Limitations</h1>
            <p className="hero-subtitle mt-3 max-w-3xl">
              Source details, time coverage, and known caveats for the lobbying records displayed on this site.
            </p>
            <div className="mt-5 inline-flex items-center rounded-md bg-white/90 px-4 py-2 text-sm md:text-base font-semibold text-slate-900">
              Last updated: {formatDate(coverage.last_published_at)}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          {fetchError && (
            <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/40 p-4 text-red-800 dark:text-red-200">
              Could not load dataset metadata: {fetchError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="surface-card">
              <h2 className="text-lg font-semibold mb-3">Coverage</h2>
              <ul className="space-y-2 text-sm md:text-base">
                <li>
                  <strong>Period range:</strong> {coverage.earliest_period || "Unavailable"} to{" "}
                  {coverage.latest_period || "Unavailable"}
                </li>
                <li>
                  <strong>First published return date:</strong> {formatDate(coverage.first_published_at)}
                </li>
                <li>
                  <strong>Latest published return date:</strong> {formatDate(coverage.last_published_at)}
                </li>
                <li>
                  <strong>Database file refreshed:</strong> {formatDate(freshness.db_last_modified_at)}
                </li>
              </ul>
            </div>

            <div className="surface-card">
              <h2 className="text-lg font-semibold mb-3">Dataset Size</h2>
              <ul className="space-y-2 text-sm md:text-base">
                <li>
                  <strong>Lobbying returns:</strong> {formatNumber(summary.total_returns)}
                </li>
                <li>
                  <strong>Reporting periods:</strong> {formatNumber(summary.total_periods)}
                </li>
                <li>
                  <strong>Distinct lobbyists:</strong> {formatNumber(summary.total_lobbyists)}
                </li>
                <li>
                  <strong>Distinct officials (DPO entries):</strong> {formatNumber(summary.total_officials)}
                </li>
              </ul>
            </div>
          </div>

          <div className="surface-card">
            <h2 className="text-lg font-semibold mb-3">What counts as a lobbying return</h2>
            <p className="text-sm md:text-base leading-7 text-muted-ui">
              Data is sourced from the{" "}
              <a href="https://www.lobbying.ie/" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                Irish Register of Lobbying
              </a>
              . A return is a published filing on that register that records lobbying activity, including the lobbyist,
              subject matter, intended result, activities, and Designated Public Officials contacted.
            </p>
            <p className="mt-3 text-sm md:text-base leading-7 text-muted-ui">
              Ireland uses reporting cycles every four months. Returns shown here are grouped using the period values
              supplied in the official export.
            </p>
          </div>

          <div className="surface-card">
            <h2 className="text-lg font-semibold mb-3">Known gaps and edge cases</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-ui">
              <li>Name normalization is applied to merge common spelling and accent variants, which can still miss some matches.</li>
              <li>Source data may include duplicates or amended filings that require interpretation.</li>
              <li>Some records can have missing or inconsistent official names, titles, or activity details.</li>
              <li>This site depends on periodic CSV exports and is not a real-time mirror of lobbying.ie.</li>
            </ul>
            <p className="mt-4 text-sm md:text-base">
              Found a data problem?{" "}
              <a
                href="https://github.com/robmcelhinney/lobbyieng/issues/new?template=report-data-issue.md"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline"
              >
                Report a data issue
              </a>
              .
            </p>
          </div>
        </section>
      </main>
    </>
  )
}
