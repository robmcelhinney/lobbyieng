import React from "react"
import Head from "next/head"

export default function ConnectionsOverview() {
    return (
        <>
            <Head>
                <title>Connections Overview – Lobbyists</title>
            </Head>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-blue-900 text-white py-4">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <h1 className="text-3xl font-bold">
                            Connections Overview
                        </h1>
                        <p className="mt-1">
                            Explore connections for any official by visiting{" "}
                            <code>/connections/[slug]</code> in the URL.
                        </p>
                    </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 py-8">
                    <div className="bg-white border rounded-md shadow-md p-8 text-center">
                        <h2 className="text-xl font-semibold mb-4">
                            How to use
                        </h2>
                        <p>
                            To view a force-directed graph of lobbying
                            connections for a specific official, go to{" "}
                            <code>/connections/[slug]</code>.<br />
                            For example: <code>/connections/simon-harris</code>
                        </p>
                    </div>
                </main>
            </div>
        </>
    )
}
