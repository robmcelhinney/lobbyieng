import React, { useRef, useEffect, useState } from "react"
import Head from "next/head"
import { useRouter } from "next/router"
import { Chart, ArcElement, Tooltip, Legend } from "chart.js"
import { Pie } from "react-chartjs-2"

Chart.register(ArcElement, Tooltip, Legend)

export default function MethodsPieChartOfficial() {
    const router = useRouter()
    const { slug } = router.query
    const [methodCounts, setMethodCounts] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [name, setName] = useState("")
    const pieRef = useRef(null)

    useEffect(() => {
        if (!slug) return
        async function fetchMethods() {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch(`/api/officials/${slug}/methods`)
                if (!res.ok) throw new Error("Failed to fetch methods")
                const data = await res.json()
                setMethodCounts(data.methods || {})
                setName(data.name || "")
            } catch (err) {
                setError(err.message)
                setMethodCounts({})
                setName("")
            } finally {
                setLoading(false)
            }
        }
        fetchMethods()
    }, [slug])

    const chartData = {
        labels: Object.keys(methodCounts),
        datasets: [
            {
                data: Object.values(methodCounts),
                backgroundColor: [
                    "#1bc98e",
                    "#3da5d9",
                    "#fbb13c",
                    "#d7263d",
                    "#8884d8",
                    "#82ca9d",
                ],
            },
        ],
    }

    return (
        <>
            <Head>
                <title>
                    {name
                        ? `Lobbying Methods for ${name}`
                        : "Lobbying Methods Breakdown"}
                </title>
            </Head>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                <header className="bg-blue-900 dark:bg-gray-800 text-white dark:text-gray-100 py-4 shadow">
                    <div className="max-w-3xl mx-auto px-4 text-center">
                        <h1 className="text-3xl font-bold">
                            {name
                                ? `Lobbying Methods for ${name}`
                                : "Lobbying Methods Breakdown"}
                        </h1>
                        <p className="mt-1">
                            Proportion of Meetings, Emails, Calls, and other
                            methods
                        </p>
                    </div>
                </header>
                <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
                    <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-md p-6 flex flex-col items-center">
                        {loading ? (
                            <div className="text-blue-700 dark:text-blue-300">
                                Loading...
                            </div>
                        ) : error ? (
                            <div className="text-red-600 dark:text-red-400">
                                {error}
                            </div>
                        ) : (
                            <div style={{ width: 360, height: 360 }}>
                                <Pie ref={pieRef} data={chartData} />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </>
    )
}
