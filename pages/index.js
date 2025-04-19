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
                <meta
                    property="og:image"
                    content="/android-chrome-512x512.png"
                />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Lobbyieng" />
                <meta
                    name="twitter:description"
                    content="Visualise and explore Irish lobbying activity, officials, and lobbyists."
                />
                <meta
                    name="twitter:image"
                    content="/android-chrome-512x512.png"
                />
            </Head>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                <header className="bg-blue-900 dark:bg-gray-800 text-white dark:text-cb-dark-text py-4 shadow">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <h1 className="text-4xl font-bold mb-2">Lobbyieng</h1>
                        <p className="text-lg mb-4">
                            Welcome to the Irish lobbying and officials
                            database.
                        </p>
                        <nav className="flex flex-wrap justify-center gap-6 mt-4">
                            <Link
                                href="/dail"
                                className="text-white text-lg font-semibold hover:underline"
                            >
                                Dáil Search
                            </Link>
                            <Link
                                href="/officials"
                                className="text-white text-lg font-semibold hover:underline"
                            >
                                All Officials
                            </Link>
                            <Link
                                href="/lobbyists"
                                className="text-white text-lg font-semibold hover:underline"
                            >
                                Lobbyists
                            </Link>
                        </nav>
                    </div>
                </header>
                <main className="max-w-3xl mx-auto px-4 py-16 text-center">
                    <div className="mb-8 card text-left">
                        <h2 className="text-xl font-bold mb-2">
                            About this project
                        </h2>
                        <p className="mb-2">
                            This site visualises lobbying activity involving
                            elected Irish officials. It pulls data from
                            Ireland&#39;s official lobbying register, parses it,
                            and links each lobbying record to the politicians
                            lobbied. You can browse records by official, filter
                            by job title, time period, or name, and view
                            detailed information for each lobbying activity —
                            including the lobbyist, their goals, methods used
                            (e.g. meetings, emails), and which officials were
                            contacted. This project aims to make lobbying
                            activity more transparent, navigable, and searchable
                            for citizens, journalists, and researchers. This
                            project provides a searchable, browsable interface
                            to Irish lobbying and officials data. All data is
                            sourced from the official Register of Lobbying at
                            <a
                                href="https://www.lobbying.ie/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 underline ml-1"
                            >
                                lobbying.ie
                            </a>
                            .
                        </p>
                        <p className="mb-2">
                            Lobbyieng is open source. You can view and
                            contribute to the code on
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
                    <h2 className="text-2xl font-semibold mb-4">
                        What would you like to explore?
                    </h2>
                    <ul className="space-y-4">
                        <li>
                            <Link
                                href="/dail"
                                className="text-blue-700 underline text-lg hover:text-blue-900"
                            >
                                Search Dáil Members (TDs)
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/officials"
                                className="text-blue-700 underline text-lg hover:text-blue-900"
                            >
                                Browse All Officials
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/lobbyists"
                                className="text-blue-700 underline text-lg hover:text-blue-900"
                            >
                                Browse Lobbyists
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/chord"
                                className="text-blue-700 underline text-lg hover:text-blue-900"
                            >
                                Compare Officials (Chord Diagram)
                            </Link>
                            <span className="block text-gray-600 text-sm ml-1">
                                Visualise shared lobbyists between two officials
                            </span>
                        </li>
                    </ul>
                </main>
            </div>
        </>
    )
}
