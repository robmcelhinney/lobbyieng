import React, { useRef, useState, useEffect } from "react"
import dynamic from "next/dynamic"
import Head from "next/head"
import { useRouter } from "next/router"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
    ssr: false,
})

export default function ConnectionsOfficial() {
    const router = useRouter()
    const { slug } = router.query
    const officialSlug = slug || "simon-harris"

    const [graphData, setGraphData] = useState({ nodes: [], links: [] })
    const fgRef = useRef()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [years, setYears] = useState([])
    const [selectedYear, setSelectedYear] = useState("All")
    const [methods, setMethods] = useState([])
    const [selectedMethod, setSelectedMethod] = useState("All")

    const LEGEND_CATEGORIES = [
        { label: "1 lobbying return", min: 1, max: 1, color: "#1bc98e" },
        { label: "2 lobbying returns", min: 2, max: 2, color: "#3da5d9" },
        { label: "3 lobbying returns", min: 3, max: 3, color: "#fbb13c" },
        {
            label: "4 or more lobbying returns",
            min: 4,
            max: Infinity,
            color: "#d7263d",
        },
    ]
    const [selectedCategories, setSelectedCategories] = useState([0, 1, 2, 3])

    const visibleNodeIds = React.useMemo(() => {
        if (!graphData || !graphData.links || !graphData.nodes) return new Set()
        const selectedRanges = selectedCategories.map(
            (idx) => LEGEND_CATEGORIES[idx]
        )
        const filteredLinks = graphData.links.filter((link) =>
            selectedRanges.some(
                (cat) => link.count >= cat.min && link.count <= cat.max
            )
        )
        const ids = new Set()
        const nodeIdSet = new Set(
            graphData.nodes.map((n) => String(n.id).trim().toLowerCase())
        )
        filteredLinks.forEach((link) => {
            let sourceId = link.source
            let targetId = link.target
            if (
                typeof sourceId === "object" &&
                sourceId !== null &&
                "id" in sourceId
            )
                sourceId = sourceId.id
            if (
                typeof targetId === "object" &&
                targetId !== null &&
                "id" in targetId
            )
                targetId = targetId.id
            sourceId = String(sourceId).trim().toLowerCase()
            targetId = String(targetId).trim().toLowerCase()
            if (nodeIdSet.has(sourceId)) ids.add(sourceId)
            if (nodeIdSet.has(targetId)) ids.add(targetId)
        })
        const centralNode = graphData.nodes.find((n) => n.group === 1)
        if (centralNode) ids.add(String(centralNode.id).trim().toLowerCase())
        return ids
    }, [graphData, selectedCategories])

    const filteredGraphData = React.useMemo(() => {
        if (!graphData || !graphData.links) return graphData
        const selectedRanges = selectedCategories.map(
            (idx) => LEGEND_CATEGORIES[idx]
        )
        const filteredLinks = graphData.links.filter((link) =>
            selectedRanges.some(
                (cat) => link.count >= cat.min && link.count <= cat.max
            )
        )
        return { nodes: graphData.nodes, links: filteredLinks }
    }, [graphData, selectedCategories])

    const handleLegendClick = (idx, event) => {
        if (event.ctrlKey || event.metaKey) {
            setSelectedCategories((prev) =>
                prev.includes(idx)
                    ? prev.filter((i) => i !== idx)
                    : [...prev, idx]
            )
        } else {
            setSelectedCategories((prev) =>
                prev.length === 1 && prev[0] === idx ? [0, 1, 2, 3] : [idx]
            )
        }
    }

    useEffect(() => {
        async function fetchLatestYearAndMethodAndData() {
            try {
                const res = await fetch("/api/periods-latest")
                let latestYear = null
                if (res.ok) {
                    const data = await res.json()
                    const match = data.period && data.period.match(/\d{4}/g)
                    if (match && match.length > 0) {
                        latestYear = match[match.length - 1]
                        setSelectedYear(latestYear)
                    }
                }
                let latestMethod = null
                if (latestYear) {
                    const res2 = await fetch(
                        `/api/officials/${officialSlug}?per_page=All&year=${encodeURIComponent(
                            latestYear
                        )}`
                    )
                    if (!res2.ok)
                        throw new Error(
                            "Official not found or failed to fetch data"
                        )
                    const data2 = await res2.json()
                    if (data2.methods && data2.methods.length > 0) {
                        if (data2.methods.includes("Meeting")) {
                            latestMethod = "Meeting"
                        } else if (data2.methods.length > 0) {
                            latestMethod = "All"
                        } else {
                            latestMethod = null
                        }
                        setSelectedMethod(latestMethod)
                        setMethods(data2.methods)
                    }
                    const centralName =
                        data2.name || officialSlug.replace(/-/g, " ")
                    const centralId = centralName.trim().toLowerCase()
                    // Use td_thumbnails image if available, else fallback handled in nodeCanvasObject
                    const centralImg = `/images/td_thumbnails/${officialSlug}.jpg`
                    const nodes = [
                        {
                            id: centralId,
                            label: centralName,
                            group: 1,
                            img: centralImg,
                            fx: 0,
                            fy: 0,
                        },
                    ]
                    const lobbyistCounts = {}
                    for (const record of data2.records || []) {
                        if (record.lobbyist_name) {
                            lobbyistCounts[record.lobbyist_name] =
                                (lobbyistCounts[record.lobbyist_name] || 0) + 1
                        }
                    }
                    let links = []
                    for (const lobbyist in lobbyistCounts) {
                        const normId = lobbyist.trim().toLowerCase()
                        nodes.push({
                            id: normId,
                            label: lobbyist,
                            group: 2,
                        })
                        links.push({
                            source: centralId,
                            target: normId,
                            count: lobbyistCounts[lobbyist],
                        })
                    }
                    links = links.map((l) => ({
                        ...l,
                        source:
                            typeof l.source === "object" &&
                            l.source &&
                            "id" in l.source
                                ? String(l.source.id).trim().toLowerCase()
                                : String(l.source).trim().toLowerCase(),
                        target:
                            typeof l.target === "object" &&
                            l.target &&
                            "id" in l.target
                                ? String(l.target.id).trim().toLowerCase()
                                : String(l.target).trim().toLowerCase(),
                    }))
                    setGraphData({ nodes, links })
                    setLoading(false)
                }
                if (latestYear && latestMethod) {
                    setLoading(true)
                    setError(null)
                    const res3 = await fetch(
                        `/api/officials/${officialSlug}?per_page=All&year=${encodeURIComponent(
                            latestYear
                        )}&method=${encodeURIComponent(latestMethod)}`
                    )
                    if (!res3.ok)
                        throw new Error(
                            "Official not found or failed to fetch data"
                        )
                    const data3 = await res3.json()
                    const centralName =
                        data3.name || officialSlug.replace(/-/g, " ")
                    const centralId = centralName.trim().toLowerCase()
                    const nodes = [
                        {
                            id: centralId,
                            label: centralName,
                            group: 1,
                            img: `/images/td_thumbnails/${officialSlug}.jpg`,
                            fx: 0,
                            fy: 0,
                        },
                    ]
                    const lobbyistCounts = {}
                    for (const record of data3.records || []) {
                        if (record.lobbyist_name) {
                            lobbyistCounts[record.lobbyist_name] =
                                (lobbyistCounts[record.lobbyist_name] || 0) + 1
                        }
                    }
                    let links = []
                    for (const lobbyist in lobbyistCounts) {
                        const normId = lobbyist.trim().toLowerCase()
                        nodes.push({ id: normId, label: lobbyist, group: 2 })
                        links.push({
                            source: centralId,
                            target: normId,
                            count: lobbyistCounts[lobbyist],
                        })
                    }
                    links = links.map((l) => ({
                        ...l,
                        source:
                            typeof l.source === "object" &&
                            l.source &&
                            "id" in l.source
                                ? String(l.source.id).trim().toLowerCase()
                                : String(l.source).trim().toLowerCase(),
                        target:
                            typeof l.target === "object" &&
                            l.target &&
                            "id" in l.target
                                ? String(l.target.id).trim().toLowerCase()
                                : String(l.target).trim().toLowerCase(),
                    }))
                    setGraphData({ nodes, links })
                    setLoading(false)
                }
            } catch (err) {
                setError(err.message)
                setLoading(false)
            }
        }
        if (slug) fetchLatestYearAndMethodAndData()
    }, [slug])

    useEffect(() => {
        async function fetchFilters() {
            try {
                const res = await fetch(
                    `/api/officials/${officialSlug}?per_page=All`
                )
                if (!res.ok)
                    throw new Error(
                        "Official not found or failed to fetch filters"
                    )
                const data = await res.json()
                setYears(data.years || [])
                setMethods(data.methods || [])
            } catch (err) {
                setError(err.message)
                setYears([])
                setMethods([])
            }
        }
        if (slug) fetchFilters()
    }, [slug])

    useEffect(() => {
        if (years.length > 0) {
            const currentYear = new Date().getFullYear().toString()
            setSelectedYear(years.includes(currentYear) ? currentYear : "All")
        }
        if (methods.length > 0) {
            if (methods.includes("Meeting")) {
                setSelectedMethod("Meeting")
            } else {
                setSelectedMethod("All")
            }
        }
    }, [years, methods])

    useEffect(() => {
        if (methods.length > 0) {
            if (methods.includes("Meeting")) {
                setSelectedMethod("Meeting")
            } else {
                setSelectedMethod("All")
            }
        }
    }, [methods])

    useEffect(() => {
        if (!selectedYear || loading) return
        async function fetchConnections() {
            setLoading(true)
            setError(null)
            try {
                const yearParam =
                    selectedYear && selectedYear !== "All"
                        ? `&year=${encodeURIComponent(selectedYear)}`
                        : ""
                const methodParam =
                    selectedMethod && selectedMethod !== "All"
                        ? `&method=${encodeURIComponent(selectedMethod)}`
                        : ""
                const res = await fetch(
                    `/api/officials/${officialSlug}?per_page=All${yearParam}${methodParam}`
                )
                if (!res.ok)
                    throw new Error(
                        "Official not found or failed to fetch data"
                    )
                const data = await res.json()
                const centralName = data.name || officialSlug.replace(/-/g, " ")
                const centralId = centralName.trim().toLowerCase()
                const nodes = [
                    {
                        id: centralId,
                        label: centralName,
                        group: 1,
                        img: `/images/td_thumbnails/${officialSlug}.jpg`,
                        fx: 0,
                        fy: 0,
                    },
                ]
                const lobbyistCounts = {}
                for (const record of data.records || []) {
                    if (record.lobbyist_name) {
                        lobbyistCounts[record.lobbyist_name] =
                            (lobbyistCounts[record.lobbyist_name] || 0) + 1
                    }
                }
                let links = []
                for (const lobbyist in lobbyistCounts) {
                    const normId = lobbyist.trim().toLowerCase()
                    nodes.push({ id: normId, label: lobbyist, group: 2 })
                    links.push({
                        source: centralId,
                        target: normId,
                        count: lobbyistCounts[lobbyist],
                    })
                }
                links = links.map((l) => ({
                    ...l,
                    source:
                        typeof l.source === "object" &&
                        l.source &&
                        "id" in l.source
                            ? String(l.source.id).trim().toLowerCase()
                            : String(l.source).trim().toLowerCase(),
                    target:
                        typeof l.target === "object" &&
                        l.target &&
                        "id" in l.target
                            ? String(l.target.id).trim().toLowerCase()
                            : String(l.target).trim().toLowerCase(),
                }))
                setGraphData({ nodes, links })
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        if (selectedYear && !loading && slug) fetchConnections()
    }, [selectedYear, selectedMethod, slug])

    const getLinkColor = (link) => {
        if (link.count >= 4) return "#d7263d"
        if (link.count === 3) return "#fbb13c"
        if (link.count === 2) return "#3da5d9"
        return "#1bc98e"
    }

    // Cache for loaded images and fallback
    const imageCache = React.useRef({})

    const nodeCanvasObject = (node, ctx, globalScale) => {
        const isVisible = visibleNodeIds.has(
            String(node.id).trim().toLowerCase()
        )
        ctx.save()
        ctx.globalAlpha = isVisible ? 1 : 0.1
        let nodeColor = "#ff7f0e"
        let count = null
        if (node.group === 1) {
            nodeColor = "#1f77b4"
        } else if (graphData && graphData.links) {
            const nodeId = String(node.id).trim().toLowerCase()
            const link = graphData.links.find((l) => {
                let targetId = l.target
                if (
                    typeof targetId === "object" &&
                    targetId !== null &&
                    "id" in targetId
                ) {
                    targetId = targetId.id
                }
                targetId = String(targetId).trim().toLowerCase()
                return targetId === nodeId
            })
            if (link) {
                count = link.count
                nodeColor = getLinkColor(link)
            }
        }
        if (node.img) {
            const size = 20
            let img = imageCache.current[node.img]
            if (!img) {
                img = new window.Image()
                img.src = node.img
                img.onerror = () => {
                    if (node.img !== "/images/politician.svg") {
                        img.src = "/images/politician.svg"
                        imageCache.current[node.img] = img
                    }
                }
                imageCache.current[node.img] = img
            }
            ctx.save()
            ctx.beginPath()
            ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI, false)
            ctx.closePath()
            ctx.clip()
            ctx.drawImage(img, node.x - size / 2, node.y - size / 2, size, size)
            ctx.restore()
            ctx.font = `${12 / globalScale}px Sans-Serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "top"
            ctx.fillStyle = "#222"
            ctx.fillText(node.label || node.id, node.x, node.y + 12)
        } else {
            const size = 2
            ctx.beginPath()
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
            ctx.fillStyle = nodeColor
            ctx.fill()
            ctx.font = `${12 / globalScale}px Sans-Serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "top"
            ctx.fillStyle = "#222"
            let label = node.label || node.id
            if (count !== null && count > 3) label = `${label} - ${count}`
            ctx.fillText(label, node.x, node.y + 8)
        }
        ctx.restore()
    }

    return (
        <>
            <Head>
                <title>Connections – {officialSlug.replace(/-/g, " ")}</title>
            </Head>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-blue-900 text-white py-4">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <h1 className="text-3xl font-bold">
                            Connections Visualization
                        </h1>
                        <p className="mt-1">
                            Lobbyists connecting to{" "}
                            {officialSlug.replace(/-/g, " ")}
                        </p>
                    </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
                    {/* Filters at the top, above the legend */}
                    <div
                        className="flex flex-col w-full relative"
                        style={{ zIndex: 10 }}
                    >
                        <div
                            className="mb-4 text-center relative"
                            style={{ zIndex: 10 }}
                        >
                            <p>
                                This force-directed graph shows the connections
                                between lobbyists and{" "}
                                {officialSlug.replace(/-/g, " ")}, based on real
                                lobbying records.
                            </p>
                            <p>Click on a node to bring you to their page.</p>
                        </div>
                        <div
                            className="mb-4 flex flex-wrap justify-center gap-4 relative"
                            style={{ zIndex: 10 }}
                        >
                            <div>
                                <label className="mr-2 font-medium">
                                    Year:
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) =>
                                        setSelectedYear(e.target.value)
                                    }
                                    className="border border-gray-300 rounded px-2 py-1"
                                >
                                    <option value="All">All</option>
                                    {years.map((year) => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mr-2 font-medium">
                                    Method:
                                </label>
                                <select
                                    value={selectedMethod}
                                    onChange={(e) =>
                                        setSelectedMethod(e.target.value)
                                    }
                                    className="border border-gray-300 rounded px-2 py-1"
                                >
                                    <option value="All">All</option>
                                    {methods.map((method) => (
                                        <option key={method} value={method}>
                                            {method}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    {/* Legend below filters */}
                    <div
                        className="w-full flex flex-col items-center relative"
                        style={{ zIndex: 10 }}
                    >
                        <div
                            className="bg-white border rounded-md shadow-md p-4 mb-4 w-full max-w-2xl relative"
                            style={{ zIndex: 10 }}
                        >
                            <h2 className="text-lg font-semibold mb-2">
                                Legend
                            </h2>
                            <ul className="space-y-2">
                                {LEGEND_CATEGORIES.map((cat, idx) => {
                                    let count = 0
                                    if (
                                        graphData &&
                                        graphData.links &&
                                        cat.min === 4
                                    ) {
                                        count = graphData.links.filter(
                                            (link) => link.count >= 4
                                        ).length
                                    }
                                    return (
                                        <li
                                            key={cat.label}
                                            className={`flex items-center gap-2 cursor-pointer select-none rounded px-1 py-0.5 transition border border-transparent ${
                                                selectedCategories.includes(idx)
                                                    ? "bg-blue-100 border-blue-400"
                                                    : "hover:bg-gray-100"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) =>
                                                    handleLegendClick(idx, e)
                                                }
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === "Enter" ||
                                                        e.key === " "
                                                    )
                                                        handleLegendClick(
                                                            idx,
                                                            e
                                                        )
                                                }}
                                                aria-pressed={selectedCategories.includes(
                                                    idx
                                                )}
                                                className="flex items-center gap-2 w-full text-left bg-transparent border-none p-0 m-0 cursor-pointer focus:outline-none"
                                            >
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        width: 18,
                                                        height: 6,
                                                        background: cat.color,
                                                        borderRadius: 2,
                                                    }}
                                                ></span>
                                                <span>
                                                    {cat.label}
                                                    {cat.min === 4 && count > 0
                                                        ? ` (${count})`
                                                        : ""}
                                                </span>
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                            <div className="mt-2 text-xs text-gray-500">
                                Click to filter. CTRL+Click to multi-select.
                                Click again to reset.
                            </div>
                        </div>
                    </div>
                    {/* Graph container at default z-index */}
                    <div
                        className="border rounded-md shadow-md flex items-center justify-center w-full relative"
                        style={{
                            minHeight: "60vh",
                            height: "70vh",
                            maxHeight: "80vh",
                        }}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-lg text-blue-700">
                                Loading...
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-full text-red-600">
                                {error}
                            </div>
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    position: "relative",
                                }}
                            >
                                <ForceGraph2D
                                    ref={fgRef}
                                    graphData={filteredGraphData}
                                    nodeLabel="id"
                                    nodeAutoColorBy="group"
                                    width={undefined}
                                    height={undefined}
                                    linkColor={getLinkColor}
                                    nodeCanvasObject={nodeCanvasObject}
                                    onNodeClick={(node) => {
                                        if (
                                            fgRef.current &&
                                            typeof fgRef.current.centerAt ===
                                                "function" &&
                                            typeof fgRef.current.zoom ===
                                                "function"
                                        ) {
                                            fgRef.current.centerAt(
                                                node.x,
                                                node.y,
                                                1000
                                            )
                                            fgRef.current.zoom(4, 1000)
                                        }
                                        // Navigation logic
                                        if (node.group === 1) {
                                            // Official node
                                            const slug = String(
                                                node.label || node.id
                                            )
                                                .trim()
                                                .toLowerCase()
                                                .replace(/\s+/g, "-")
                                            router.push(`/officials/${slug}`)
                                        } else {
                                            // Lobbyist node
                                            const slug = String(
                                                node.label || node.id
                                            )
                                                .trim()
                                                .toLowerCase()
                                                .replace(/\s+/g, "-")
                                            router.push(`/lobbyists/${slug}`)
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </>
    )
}
