import Head from "next/head"
import Link from "next/link"
import { getDataMetadata } from "../lib/dataMetadata"

function formatNumber(value) {
  if (typeof value !== "number") return "0"
  return new Intl.NumberFormat("en-IE").format(value)
}

const exploreCards = [
  {
    href: "/explore",
    title: "Explore Insights",
    description: "Top targets, movers, topic trends, and centrality metrics.",
    cta: "Open Dashboard"
  },
  {
    href: "/dail",
    title: "Find a TD",
    description: "Search Dail members and view who contacted them, when, and how.",
    cta: "Search Members"
  },
  {
    href: "/officials",
    title: "Browse Officials",
    description: "Filter all officials by period, title, and name.",
    cta: "View Officials"
  },
  {
    href: "/lobbyists",
    title: "Browse Lobbyists",
    description: "Inspect organizations and people submitting lobbying returns.",
    cta: "View Lobbyists"
  },
  {
    href: "/chord",
    title: "Compare Officials",
    description: "See overlapping lobbyists between two officials.",
    cta: "Open Comparison"
  },
  {
    href: "/data-limitations",
    title: "Data & Limitations",
    description: "Coverage dates, update cadence, and known caveats.",
    cta: "See Methodology"
  }
]

const guidedTour = [
  {
    title: "Journalist Workflow",
    steps: [
      "Start in Explore for top movers and contact hotspots.",
      "Open an official page and narrow by year/method.",
      "Share the filtered permalink and export records for your notes."
    ]
  },
  {
    title: "Student Workflow",
    steps: [
      "Use Data & Limitations to understand coverage and caveats.",
      "Pick two officials in Chord to compare overlap.",
      "Validate findings by checking source record links."
    ]
  },
  {
    title: "Citizen Workflow",
    steps: [
      "Find a TD and inspect who contacted them recently.",
      "Switch method/year filters to focus on specific activity.",
      "Use Connections view to see repeat lobbyist patterns."
    ]
  }
]

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

export default function Home({ metadata, fetchError }) {
  const summary = metadata?.summary || {}
  const coverage = metadata?.coverage || {}

  return (
    <>
      <Head>
        <title>Lobbyieng</title>
        <meta
          name="description"
          content="Lobbyieng visualises lobbying activity in Ireland. Search, browse, and explore lobbying records, officials, and lobbyists."
        />
        <meta property="og:title" content="Lobbyieng" />
        <meta
          property="og:description"
          content="Visualise and explore Irish lobbying activity, officials, and lobbyists."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://lobbyieng.com/" />
        <meta property="og:image" content="/android-chrome-512x512.png" />
      </Head>

      <main className="min-h-screen">
        <section className="hero-shell">
          <div className="max-w-6xl mx-auto px-4 py-14 md:py-16">
            <h1 className="hero-title">Lobbying in Ireland, made legible.</h1>
            <p className="hero-subtitle mt-4 max-w-3xl">
              Track who is lobbying whom, what they are lobbying about, and how patterns change over time across
              officials, lobbyists, and reporting periods.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href="/explore" className="kpi-chip card-interactive no-underline">
                Explore Insights
              </Link>
              <Link href="/dail" className="kpi-chip card-interactive no-underline">
                Find a TD
              </Link>
              <Link href="/officials" className="kpi-chip card-interactive no-underline">
                Browse Officials
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 pt-8 md:pt-10">
          <div className="surface-card">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Latest Data Snapshot</h2>
                <p className="text-muted-ui text-sm mt-1">Quick context from the most recent database build.</p>
                <p className="text-muted-ui text-sm mt-2">
                  Source:{" "}
                  <a
                    href="https://www.lobbying.ie/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold hover:underline"
                  >
                    Register of Lobbying
                  </a>
                </p>
              </div>
              <Link href="/data-limitations" className="text-sm font-semibold hover:underline">
                View full metadata
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="kpi-chip">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Latest Period</div>
                <div className="mt-1 text-sm font-semibold">{coverage.latest_period || "Unavailable"}</div>
              </div>
              <div className="kpi-chip">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Returns</div>
                <div className="mt-1 text-lg font-semibold">{formatNumber(summary.total_returns || 0)}</div>
              </div>
              <div className="kpi-chip">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Officials</div>
                <div className="mt-1 text-lg font-semibold">{formatNumber(summary.total_officials || 0)}</div>
              </div>
              <div className="kpi-chip">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Lobbyists</div>
                <div className="mt-1 text-lg font-semibold">{formatNumber(summary.total_lobbyists || 0)}</div>
              </div>
            </div>
            {fetchError ? <p className="text-sm text-red-600 mt-3">Snapshot unavailable: {fetchError}</p> : null}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-10 md:py-12">
          <div className="mb-5">
            <h2 className="section-title">Choose Your View</h2>
            <p className="text-muted-ui mt-2 text-sm md:text-base">
              Each view answers a different question about Irish lobbying activity.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exploreCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="surface-card card-interactive no-underline flex flex-col justify-between min-h-[180px]"
              >
                <div>
                  <h3 className="text-xl font-semibold">{card.title}</h3>
                  <p className="text-muted-ui mt-2 text-sm">{card.description}</p>
                </div>
                <div className="mt-6 text-sm font-semibold">{card.cta} →</div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="max-w-6xl mx-auto px-4 pb-10 text-center text-muted-ui text-sm">
          <div className="surface-card">
            <h2 className="text-lg font-semibold">Feedback & Data Issues</h2>
            <p className="mt-2 text-sm text-muted-ui">
              Spotted an error or missing context? Send feedback or open a structured data issue.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <a href="mailto:lobbyieng@robmcelhinney" className="font-semibold hover:underline">
                Contact by email
              </a>
              <a
                href="https://github.com/robmcelhinney/lobbyieng/issues/new?template=report-data-issue.md"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline"
              >
                Report data issue
              </a>
              <a
                href="https://github.com/robmcelhinney/lobbyieng/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline"
              >
                General feedback
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
