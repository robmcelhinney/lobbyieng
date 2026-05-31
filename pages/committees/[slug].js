import Head from "next/head"
import Link from "next/link"
import { getServerBaseUrl } from "../../lib/serverBaseUrl"

function formatDate(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-IE", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })
}

export async function getServerSideProps({ params, req }) {
  const baseUrl = getServerBaseUrl(req)
  try {
    const res = await fetch(`${baseUrl}/api/committees/${params.slug}`)
    if (!res.ok) return { notFound: true }
    const committee = await res.json()
    return { props: { committee } }
  } catch (err) {
    console.error("Error fetching committee:", err)
    return { notFound: true }
  }
}

export default function CommitteePage({ committee }) {
  const members = committee?.members || []

  return (
    <>
      <Head>
        <title>{`Committee - ${committee.name}`}</title>
      </Head>
      <div className="min-h-screen">
        <header className="hero-shell">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <Link href="/committees" className="text-sm font-semibold text-blue-100 hover:underline no-underline">
              Committees
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-2">{committee.name}</h1>
            <p className="hero-subtitle mt-2">
              {members.length} current {members.length === 1 ? "member" : "members"}
              {committee.scraped_at ? ` · Updated ${formatDate(committee.scraped_at)}` : ""}
            </p>
            {committee.membership_url ? (
              <a
                href={committee.membership_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 px-4 py-2 rounded-md border border-white/60 text-white hover:bg-white/10 transition font-semibold text-sm no-underline"
              >
                View source membership page
              </a>
            ) : null}
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <section className="surface-card mb-6">
            <h2 className="text-xl font-semibold mb-2">Current Members</h2>
            <p className="text-sm text-muted-ui">
              These are current Oireachtas committee memberships. Lobbying counts show matched returns where that member
              appears as a Designated Public Official in the Register of Lobbying.
            </p>
          </section>

          <section className="surface-card">
            {members.length > 0 ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.map((member) => (
                  <li key={`${member.member_slug}-${member.role || "member"}`}>
                    <div className="surface-card h-full">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold">
                            {member.has_lobbying_profile ? (
                              <Link href={`/officials/${member.member_slug}`} className="hover:underline no-underline">
                                {member.member_name}
                              </Link>
                            ) : (
                              member.member_name
                            )}
                          </h3>
                          {member.role ? <p className="text-sm font-semibold mt-1">{member.role}</p> : null}
                          {member.constituency ? (
                            <p className="text-sm text-muted-ui mt-1">{member.constituency}</p>
                          ) : null}
                        </div>
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-[color:var(--ui-bg-soft)] text-[color:var(--ui-text)]">
                          {member.lobbying_return_count} returns
                        </span>
                      </div>
                      {member.member_url ? (
                        <a
                          href={member.member_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-3 text-sm font-semibold hover:underline"
                        >
                          Oireachtas profile
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-ui">No current members found for this committee.</p>
            )}
          </section>
        </main>
      </div>
    </>
  )
}
