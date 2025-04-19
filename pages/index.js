import Head from "next/head"
import Link from "next/link"

export default function Home() {
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
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Lobbyieng" />
        <meta
          name="twitter:description"
          content="Visualise and explore Irish lobbying activity, officials, and lobbyists."
        />
        <meta name="twitter:image" content="/android-chrome-512x512.png" />
      </Head>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <header className="bg-blue-900 dark:bg-gray-800 text-white dark:text-cb-dark-text py-4 shadow">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-2">Lobbyieng</h1>
            <p className="text-lg mb-4">Welcome to the Irish lobbying and officials database.</p>
            <nav className="flex flex-wrap justify-center gap-6 mt-4">
              <Link href="/dail" className="text-white text-lg font-semibold hover:underline">
                Dáil Search
              </Link>
              <Link href="/officials" className="text-white text-lg font-semibold hover:underline">
                All Officials
              </Link>
              <Link href="/lobbyists" className="text-white text-lg font-semibold hover:underline">
                Lobbyists
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="mb-8 card text-left">
            <h2 className="text-xl font-bold mb-2">About this project</h2>
            <p className="mb-2">
              This site visualises lobbying activity involving elected Irish officials. It pulls data from Ireland&#39;s
              official lobbying register and links each lobbying record to the politicians contacted. You can filter by
              name, job title, or date; explore detailed records showing the lobbyist, their goals, methods (e.g.
              meetings, emails), and the officials involved.
            </p>
            <p className="mb-2">
              The aim is to make lobbying in Ireland more transparent, searchable, and useful for citizens, journalists,
              and researchers. All data comes from the official
              <a
                href="https://www.lobbying.ie/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline ml-1"
              >
                Register of Lobbying
              </a>
              .
            </p>
            <p className="mb-2">
              Lobbyieng is open source — view and contribute on
              <a
                href="https://github.com/robmcelhinney/lobbyieng/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline ml-1"
              >
                GitHub
              </a>
              .
            </p>
          </div>
          <h2 className="text-2xl font-semibold mb-4">What would you like to explore?</h2>
          <ul className="space-y-4">
            <li>
              <Link href="/dail" className="text-blue-700 underline text-lg hover:text-blue-900">
                Search Dáil Members (TDs)
              </Link>
            </li>
            <li>
              <Link href="/officials" className="text-blue-700 underline text-lg hover:text-blue-900">
                Browse All Officials
              </Link>
            </li>
            <li>
              <Link href="/lobbyists" className="text-blue-700 underline text-lg hover:text-blue-900">
                Browse Lobbyists
              </Link>
            </li>
            <li>
              <Link href="/chord" className="text-blue-700 underline text-lg hover:text-blue-900">
                Compare Officials (Chord Diagram)
              </Link>
              <span className="block text-gray-600 text-sm ml-1">Visualise shared lobbyists between two officials</span>
            </li>
          </ul>
        </main>
        <footer className="max-w-3xl mx-auto px-4 pb-8 text-center text-gray-600 dark:text-gray-400">
          <hr className="my-8 border-gray-300 dark:border-gray-700" />
          <p>
            Contact:{" "}
            <a href="mailto:lobbyieng@robmcelhinney" className="text-blue-700 underline hover:text-blue-900">
              lobbyieng@robmcelhinney
            </a>
          </p>
        </footer>
      </div>
    </>
  )
}
