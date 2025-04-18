import React from "react"
import Head from "next/head"

export default function ConnectionsOverview() {
    return (
        <>
            <Head>
                <title>Connections Overview – Lobbyists</title>
            </Head>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                <header className="bg-blue-900 dark:bg-gray-800 text-white dark:text-gray-100 py-4">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <h1 className="text-3xl font-bold">
                            Connections Overview
                        </h1>
                        <p className="mt-1">
                            Explore connections for any official by visiting{" "}
                            <code className="bg-gray-200 dark:bg-gray-700 dark:text-gray-100 px-1 py-0.5 rounded">
                                /connections/[slug]
                            </code>
                            .
                        </p>
                    </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 py-8">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md p-8 text-center">
                        <h2 className="text-xl font-semibold mb-4">
                            How to use
                        </h2>
                        <p className="mb-2">
                            To view a force-directed graph of lobbying
                            connections for a specific official, go to{" "}
                            <code className="bg-gray-200 dark:bg-gray-700 dark:text-gray-100 px-1 py-0.5 rounded">
                                /connections/[slug]
                            </code>
                            .
                        </p>
                        <p>
                            For example:{" "}
                            <code className="bg-gray-200 dark:bg-gray-700 dark:text-gray-100 px-1 py-0.5 rounded">
                                /connections/simon-harris
                            </code>
                        </p>
                    </div>
                </main>
            </div>
        </>
    )
}
