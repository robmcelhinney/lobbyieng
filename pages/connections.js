import React, { useRef, useState, useEffect } from "react"
import dynamic from "next/dynamic"
import Head from "next/head"

// Dynamically import ForceGraph2D to avoid SSR issues.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
    ssr: false,
})

const OFFICIAL_SLUG = "simon-harris"

export default function Connections() {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] })
    const fgRef = useRef()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [years, setYears] = useState([])
    const [selectedYear, setSelectedYear] = useState("All")
    const [methods, setMethods] = useState([])
    const [selectedMethod, setSelectedMethod] = useState("All")

    // Legend categories and their corresponding counts/colors
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

    // State for selected legend categories (indices)
    const [selectedCategories, setSelectedCategories] = useState([0, 1, 2, 3])

    // Compute which nodes should be visible (connected by visible links or the central node)
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
        // Map node ids for robust matching
        const nodeIdSet = new Set(
            graphData.nodes.map((n) => String(n.id).trim().toLowerCase())
        )
        filteredLinks.forEach((link) => {
            // Handle both object and string/number for source/target
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
        // Always include the central politician node
        const centralNode = graphData.nodes.find((n) => n.group === 1)
        if (centralNode) ids.add(String(centralNode.id).trim().toLowerCase())
        return ids
    }, [graphData, selectedCategories])

    // Only filter links, not nodes
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

    // Legend click handler
    const handleLegendClick = (idx, event) => {
        if (event.ctrlKey || event.metaKey) {
            // Multi-select
            setSelectedCategories((prev) =>
                prev.includes(idx)
                    ? prev.filter((i) => i !== idx)
                    : [...prev, idx]
            )
        } else {
            // Single select
            setSelectedCategories((prev) =>
                prev.length === 1 && prev[0] === idx ? [0, 1, 2, 3] : [idx]
            )
        }
    }

    // Fetch most recent year and method before loading filters and graph data
    useEffect(() => {
        async function fetchLatestYearAndMethodAndData() {
            try {
                // Fetch latest year
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
                // Fetch available methods for the latest year
                let latestMethod = null
                if (latestYear) {
                    const res2 = await fetch(
                        `/api/officials/${OFFICIAL_SLUG}?per_page=All&year=${encodeURIComponent(
                            latestYear
                        )}`
                    )
                    if (res2.ok) {
                        const data2 = await res2.json()
                        if (data2.methods && data2.methods.length > 0) {
                            latestMethod = data2.methods.includes("Meeting")
                                ? "Meeting"
                                : data2.methods[0]
                            setSelectedMethod(latestMethod)
                            setMethods(data2.methods)
                        }
                        // Central node: Simon Harris, fixed in center
                        const centralName = data2.name || "Simon Harris"
                        const centralId = centralName.trim().toLowerCase()
                        const nodes = [
                            {
                                id: centralId,
                                label: centralName,
                                group: 1,
                                img: "/images/politician.svg",
                                fx: 0,
                                fy: 0,
                            },
                        ]
                        // Count appearances per lobbyist
                        const lobbyistCounts = {}
                        for (const record of data2.records || []) {
                            if (record.lobbyist_name) {
                                lobbyistCounts[record.lobbyist_name] =
                                    (lobbyistCounts[record.lobbyist_name] ||
                                        0) + 1
                            }
                        }
                        // Unique lobbyists
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
                        // Force all link source/target to be string ids
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
                }
                // Fetch graph data for latest year and method only
                if (latestYear && latestMethod) {
                    setLoading(true)
                    setError(null)
                    const res3 = await fetch(
                        `/api/officials/${OFFICIAL_SLUG}?per_page=All&year=${encodeURIComponent(
                            latestYear
                        )}&method=${encodeURIComponent(latestMethod)}`
                    )
                    if (!res3.ok) throw new Error("Failed to fetch data")
                    const data3 = await res3.json()
                    // Central node: Simon Harris, fixed in center
                    const centralName = data3.name || "Simon Harris"
                    const centralId = centralName.trim().toLowerCase()
                    const nodes = [
                        {
                            id: centralId,
                            label: centralName,
                            group: 1,
                            img: "/images/politician.svg",
                            fx: 0,
                            fy: 0,
                        },
                    ]
                    // Count appearances per lobbyist
                    const lobbyistCounts = {}
                    for (const record of data3.records || []) {
                        if (record.lobbyist_name) {
                            lobbyistCounts[record.lobbyist_name] =
                                (lobbyistCounts[record.lobbyist_name] || 0) + 1
                        }
                    }
                    // Unique lobbyists
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
                    // Force all link source/target to be string ids
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
        fetchLatestYearAndMethodAndData()
    }, [])

    // Fetch available years and methods on mount (unchanged)
    useEffect(() => {
        async function fetchFilters() {
            try {
                const res = await fetch(
                    `/api/officials/${OFFICIAL_SLUG}?per_page=All`
                )
                if (!res.ok) throw new Error("Failed to fetch filters")
                const data = await res.json()
                setYears(data.years || [])
                setMethods(data.methods || [])
            } catch {
                // Ignore errors for now
            }
        }
        fetchFilters()
    }, [])

    // Default to current year and 'Meeting' for filters
    useEffect(() => {
        if (years.length > 0) {
            const currentYear = new Date().getFullYear().toString()
            setSelectedYear(years.includes(currentYear) ? currentYear : "All")
        }
        if (methods.length > 0) {
            setSelectedMethod(methods.includes("Meeting") ? "Meeting" : "All")
        }
    }, [years, methods])

    // Default to 'Meeting' for method when methods are loaded
    useEffect(() => {
        if (methods.length > 0) {
            setSelectedMethod(methods.includes("Meeting") ? "Meeting" : "All")
        }
    }, [methods])

    // Fetch graph data when year/method changes (but skip initial load)
    useEffect(() => {
        // Only run if selectedYear or selectedMethod changes after initial load
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
                    `/api/officials/${OFFICIAL_SLUG}?per_page=All${yearParam}${methodParam}`
                )
                if (!res.ok) throw new Error("Failed to fetch data")
                const data = await res.json()
                // Central node: Simon Harris, fixed in center
                const centralName = data.name || "Simon Harris"
                const centralId = centralName.trim().toLowerCase()
                const nodes = [
                    {
                        id: centralId,
                        label: centralName,
                        group: 1,
                        img: "/images/politician.svg",
                        fx: 0,
                        fy: 0,
                    },
                ]
                // Count appearances per lobbyist
                const lobbyistCounts = {}
                for (const record of data.records || []) {
                    if (record.lobbyist_name) {
                        lobbyistCounts[record.lobbyist_name] =
                            (lobbyistCounts[record.lobbyist_name] || 0) + 1
                    }
                }
                // Unique lobbyists
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
                // Force all link source/target to be string ids
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
        // Only fetch if not initial load
        if (selectedYear && !loading) fetchConnections()
    }, [selectedYear, selectedMethod])

    // Link color function
    const getLinkColor = (link) => {
        if (link.count >= 4) return "#d7263d" // D: 4+ (red)
        if (link.count === 3) return "#fbb13c" // C: 3 (orange)
        if (link.count === 2) return "#3da5d9" // B: 2 (blue)
        return "#1bc98e" // A: 1 (green)
    }

    // Custom node rendering for images
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
            // Only look for links where this node is the target (normalized)
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
            const size = 20 // smaller size for the SVG
            const img = new window.Image()
            img.src = node.img
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
            // Smaller default node (circle)
            const size = 2
            ctx.beginPath()
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
            ctx.fillStyle = nodeColor
            ctx.fill()
            // Draw label with count if available
            ctx.font = `${12 / globalScale}px Sans-Serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "top"
            ctx.fillStyle = "#222"
            let label = node.label || node.id
            if (count && count > 3) label = `${label} - ${count} `
            ctx.fillText(label, node.x, node.y + 8)
        }
        ctx.restore()
    }

    return (
        <>
            <Head>
                <title>Connections – Lobbyists</title>
            </Head>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-blue-900 text-white py-4">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <h1 className="text-3xl font-bold">
                            Connections Visualization
                        </h1>
                        <p className="mt-1">
                            Lobbyists connecting to Simon Harris
                        </p>
                    </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                        <div className="mb-4 text-center">
                            <p>
                                This force-directed graph shows the connections
                                between lobbyists and Simon Harris, based on
                                real lobbying records.
                            </p>
                        </div>
                        {/* Year and Method Filters */}
                        <div className="mb-4 flex justify-center gap-4">
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
                            {/* Method Filter */}
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
                        <div
                            className="border rounded-md shadow-md flex items-center justify-center"
                            style={{ height: "800px" }}
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
                                    }}
                                >
                                    {console.log(
                                        "filteredGraphData",
                                        filteredGraphData
                                    )}
                                    <ForceGraph2D
                                        ref={fgRef}
                                        graphData={filteredGraphData}
                                        nodeLabel="id"
                                        nodeAutoColorBy="group"
                                        width={800}
                                        height={750}
                                        linkColor={getLinkColor}
                                        nodeCanvasObject={nodeCanvasObject}
                                        onNodeClick={(node) => {
                                            if (
                                                fgRef.current &&
                                                typeof fgRef.current
                                                    .centerAt === "function" &&
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
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <aside className="w-full md:w-64 flex-shrink-0">
                        <div className="bg-white border rounded-md shadow-md p-4 mb-4">
                            <h2 className="text-lg font-semibold mb-2">
                                Legend
                            </h2>
                            <ul className="space-y-2">
                                {LEGEND_CATEGORIES.map((cat, idx) => {
                                    // Count how many links are in this category
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
                                            onClick={(e) =>
                                                handleLegendClick(idx, e)
                                            }
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === "Enter" ||
                                                    e.key === " "
                                                )
                                                    handleLegendClick(idx, e)
                                            }}
                                            aria-pressed={selectedCategories.includes(
                                                idx
                                            )}
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
                                        </li>
                                    )
                                })}
                            </ul>
                            <div className="mt-2 text-xs text-gray-500">
                                Click to filter. CTRL+Click to multi-select.
                                Click again to reset.
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
        </>
    )
}
