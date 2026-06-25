import Head from "next/head"
import Link from "next/link"

export default function Custom404() {
  return (
    <>
      <Head>
        <title>Lobbyieng - Page not found</title>
        <meta name="description" content="This page was redacted in full." />
      </Head>
      <main className="min-h-[70vh] flex items-center">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-ui">404</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">This page was redacted in full.</h1>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center mt-8 rounded-md bg-[color:var(--ui-primary)] px-5 py-3 text-sm font-semibold text-white no-underline shadow-sm hover:opacity-90"
          >
            Show me the data
          </Link>
        </div>
      </main>
    </>
  )
}
