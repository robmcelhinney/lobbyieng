import Head from "next/head"
import Link from "next/link"
import { useMemo, useState } from "react"
import { getServerBaseUrl } from "../lib/serverBaseUrl"

const chamberLabels = {
  dail: "Dáil only",
  seanad: "Seanad only",
  joint: "Joint",
  unknown: "Unclassified"
}

export async function getServerSideProps({ req }) {
  const baseUrl = getServerBaseUrl(req)
  try {
    const res = await fetch(`${baseUrl}/api/committees`)
    const committees = res.ok ? await res.json() : []
    return { props: { committees } }
  } catch (err) {
    console.error("Error fetching committees:", err)
    return { props: { committees: [] } }
  }
}

export default function CommitteesPage({ committees = [] }) {
  const [search, setSearch] = useState("")
  const [chamberType, setChamberType] = useState("all")
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return committees.filter((committee) => {
      const queryMatch = query ? committee.name.toLowerCase().includes(query) : true
      const chamberMatch = chamberType === "all" ? true : committee.chamber_type === chamberType
      return queryMatch && chamberMatch
    })
  }, [committees, search, chamberType])

  return (
    <>
      <Head>
        <title>Lobbyieng - Committees</title>
      </Head>
      <div className="min-h-screen">
        <header className="hero-shell">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Oireachtas Committees</h1>
            <p className="hero-subtitle mt-2">Browse current committee memberships and linked lobbying activity.</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <section className="surface-card mb-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-full max-w-xl">
                <label className="block mb-1 text-sm font-semibold text-muted-ui">Committee</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search committees..."
                  className="native-select w-full border border-[var(--ui-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-full sm:w-56">
                <label className="block mb-1 text-sm font-semibold text-muted-ui">Chamber</label>
                <select
                  value={chamberType}
                  onChange={(e) => setChamberType(e.target.value)}
                  className="native-select w-full border border-[var(--ui-border)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All committees</option>
                  <option value="dail">Dáil only</option>
                  <option value="seanad">Seanad only</option>
                  <option value="joint">Joint</option>
                </select>
              </div>
            </div>
          </section>

          <section className="surface-card">
            <h2 className="text-2xl font-semibold mb-4">Current Committees ({filtered.length})</h2>
            {filtered.length > 0 ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((committee) => (
                  <li key={committee.slug}>
                    <Link
                      href={`/committees/${committee.slug}`}
                      className="surface-card card-interactive no-underline block"
                    >
                      <h3 className="font-bold">{committee.name}</h3>
                      <p className="text-sm text-muted-ui mt-1">
                        {committee.member_count} {committee.member_count === 1 ? "member" : "members"}
                        {committee.chamber_type ? ` · ${chamberLabels[committee.chamber_type] || "Unclassified"}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-ui">
                No committee data found. Refresh committee memberships and rebuild the database.
              </p>
            )}
          </section>
        </main>
      </div>
    </>
  )
}
