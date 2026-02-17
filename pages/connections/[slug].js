import React, { useRef, useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import Head from "next/head"
import { useRouter } from "next/router"
import Link from "next/link"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false
})

function buildGraphDataFromRecords(officialSlug, centralName, records) {
  const centralId = centralName.trim().toLowerCase()
  const centralImg = `/images/td_thumbnails/${officialSlug}.jpg`

  const lobbyistCounts = {}
  for (const record of records || []) {
    if (record.lobbyist_name) {
      lobbyistCounts[record.lobbyist_name] = (lobbyistCounts[record.lobbyist_name] || 0) + 1
    }
  }

  const lobbyists = Object.keys(lobbyistCounts).sort((a, b) => a.localeCompare(b))
  const count = lobbyists.length
  const radius = Math.max(120, Math.min(260, 90 + count * 4))

  const nodes = [
    {
      id: centralId,
      label: centralName,
      group: 1,
      img: centralImg,
      fx: 0,
      fy: 0,
      x: 0,
      y: 0
    }
  ]

  const links = []
  lobbyists.forEach((lobbyist, idx) => {
    const normId = lobbyist.trim().toLowerCase()
    const theta = (2 * Math.PI * idx) / Math.max(1, count)
    nodes.push({
      id: normId,
      label: lobbyist,
      group: 2,
      x: radius * Math.cos(theta),
      y: radius * Math.sin(theta),
      fx: radius * Math.cos(theta),
      fy: radius * Math.sin(theta)
    })
    links.push({
      source: centralId,
      target: normId,
      count: lobbyistCounts[lobbyist]
    })
  })

  return { nodes, links }
}

export default function ConnectionsOfficial() {
  const router = useRouter()
  const { slug } = router.query
  const officialSlug = slug ? String(slug).trim().toLowerCase() : ""
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""

  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const fgRef = useRef()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState("All")
  const [methods, setMethods] = useState([])
  const [selectedMethod, setSelectedMethod] = useState("All")
  const [filtersReady, setFiltersReady] = useState(false)
  const lastAutoFocusKeyRef = useRef("")
  const graphWrapRef = useRef(null)
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 })

  // Wrap LEGEND_CATEGORIES in useMemo to avoid recreating on every render
  const LEGEND_CATEGORIES = React.useMemo(
    () => [
      { label: "1 lobbying return", min: 1, max: 1, color: "#1bc98e" },
      { label: "2 lobbying returns", min: 2, max: 2, color: "#3da5d9" },
      { label: "3 lobbying returns", min: 3, max: 3, color: "#fbb13c" },
      {
        label: "4 or more lobbying returns",
        min: 4,
        max: Infinity,
        color: "#d7263d"
      }
    ],
    []
  )

  const [selectedCategories, setSelectedCategories] = useState([0, 1, 2, 3])

  const visibleNodeIds = React.useMemo(() => {
    if (!graphData || !graphData.links || !graphData.nodes) return new Set()
    const selectedRanges = selectedCategories.map((idx) => LEGEND_CATEGORIES[idx])
    const filteredLinks = graphData.links.filter((link) =>
      selectedRanges.some((cat) => link.count >= cat.min && link.count <= cat.max)
    )
    const ids = new Set()
    const nodeIdSet = new Set(graphData.nodes.map((n) => String(n.id).trim().toLowerCase()))
    filteredLinks.forEach((link) => {
      let sourceId = link.source
      let targetId = link.target
      if (typeof sourceId === "object" && sourceId !== null && "id" in sourceId) sourceId = sourceId.id
      if (typeof targetId === "object" && targetId !== null && "id" in targetId) targetId = targetId.id
      sourceId = String(sourceId).trim().toLowerCase()
      targetId = String(targetId).trim().toLowerCase()
      if (nodeIdSet.has(sourceId)) ids.add(sourceId)
      if (nodeIdSet.has(targetId)) ids.add(targetId)
    })
    const centralNode = graphData.nodes.find((n) => n.group === 1)
    if (centralNode) ids.add(String(centralNode.id).trim().toLowerCase())
    return ids
  }, [graphData, selectedCategories, LEGEND_CATEGORIES])

  const filteredGraphData = React.useMemo(() => {
    if (!graphData || !graphData.links) return graphData
    const selectedRanges = selectedCategories.map((idx) => LEGEND_CATEGORIES[idx])
    const filteredLinks = graphData.links.filter((link) =>
      selectedRanges.some((cat) => link.count >= cat.min && link.count <= cat.max)
    )
    return { nodes: graphData.nodes, links: filteredLinks }
  }, [graphData, selectedCategories, LEGEND_CATEGORIES])

  const handleLegendClick = (idx, event) => {
    if (event.ctrlKey || event.metaKey) {
      setSelectedCategories((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]))
    } else {
      setSelectedCategories((prev) => (prev.length === 1 && prev[0] === idx ? [0, 1, 2, 3] : [idx]))
    }
  }

  useEffect(() => {
    async function fetchFilters() {
      try {
        setFiltersReady(false)
        const [filtersRes, latestRes] = await Promise.all([
          fetch(`${baseUrl}/api/officials/${officialSlug}?per_page=All`),
          fetch(`${baseUrl}/api/periods-latest`)
        ])
        if (!filtersRes.ok) throw new Error("Official not found or failed to fetch filters")

        const data = await filtersRes.json()
        const nextYears = data.years || []
        const nextMethods = data.methods || []
        setYears(nextYears)
        setMethods(nextMethods)

        let latestYear = "All"
        if (latestRes.ok) {
          const latest = await latestRes.json()
          const match = latest.period && latest.period.match(/\d{4}/g)
          const fromPeriod = match && match.length ? match[match.length - 1] : null
          if (fromPeriod && nextYears.includes(fromPeriod)) latestYear = fromPeriod
        }
        setSelectedYear(latestYear)
        setSelectedMethod(nextMethods.includes("Meeting") ? "Meeting" : "All")
        setFiltersReady(true)
      } catch (err) {
        setError(err.message)
        setYears([])
        setMethods([])
        setFiltersReady(true)
      }
    }
    if (officialSlug) fetchFilters()
  }, [officialSlug, baseUrl])

  useEffect(() => {
    if (!filtersReady || !selectedYear || !officialSlug) return
    async function fetchConnections() {
      setLoading(true)
      setError(null)
      try {
        const yearParam = selectedYear && selectedYear !== "All" ? `&year=${encodeURIComponent(selectedYear)}` : ""
        const methodParam =
          selectedMethod && selectedMethod !== "All" ? `&method=${encodeURIComponent(selectedMethod)}` : ""
        const res = await fetch(`${baseUrl}/api/officials/${officialSlug}?per_page=All${yearParam}${methodParam}`)
        if (!res.ok) throw new Error("Official not found or failed to fetch data")
        const data = await res.json()
        const centralName = data.name || officialSlug.replace(/-/g, " ")
        setGraphData(buildGraphDataFromRecords(officialSlug, centralName, data.records || []))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchConnections()
  }, [selectedYear, selectedMethod, officialSlug, baseUrl, filtersReady])

  const getLinkColor = (link) => {
    if (link.count >= 4) return "#d7263d"
    if (link.count === 3) return "#fbb13c"
    if (link.count === 2) return "#3da5d9"
    return "#1bc98e"
  }

  // Cache for loaded images and fallback
  const imageCache = React.useRef({})

  const nodeCanvasObject = (node, ctx, globalScale) => {
    const isVisible = visibleNodeIds.has(String(node.id).trim().toLowerCase())
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
        if (typeof targetId === "object" && targetId !== null && "id" in targetId) {
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
    const isDarkMode = document.documentElement.classList.contains("dark")
    if (node.img) {
      const size = 50
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
      ctx.fillStyle = isDarkMode ? "#eee" : "#222"
      // ctx.fillText(node.label || node.id, node.x, node.y + 12)
    } else {
      const size = 6
      ctx.beginPath()
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
      ctx.fillStyle = nodeColor
      ctx.fill()
      ctx.font = `${12 / globalScale}px Sans-Serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      ctx.fillStyle = isDarkMode ? "#eee" : "#222"
      let label = node.label || node.id
      if (count !== null && count > 3) label = `${label} - ${count}`
      ctx.fillText(label, node.x, node.y + 8)
    }
    ctx.restore()
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const measure = () => {
      const el = graphWrapRef.current
      if (!el) return
      const width = Math.max(0, Math.floor(el.clientWidth))
      const height = Math.max(0, Math.floor(el.clientHeight))
      setGraphSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    }

    measure()
    window.addEventListener("resize", measure)
    const observer = new ResizeObserver(() => measure())
    if (graphWrapRef.current) observer.observe(graphWrapRef.current)

    return () => {
      window.removeEventListener("resize", measure)
      observer.disconnect()
    }
  }, [])

  const fitGraphView = useCallback(() => {
    const fg = fgRef.current
    if (
      !fg ||
      typeof fg.centerAt !== "function" ||
      typeof fg.zoom !== "function" ||
      typeof fg.zoomToFit !== "function"
    ) {
      return
    }

    const nodes = filteredGraphData?.nodes || []
    const centerNode = nodes.find((n) => n.group === 1) || nodes[0]
    const centerX = typeof centerNode?.x === "number" ? centerNode.x : 0
    const centerY = typeof centerNode?.y === "number" ? centerNode.y : 0
    const targetZoom = 2.1

    fg.centerAt(centerX, centerY, 260)
    fg.zoom(targetZoom, 260)
  }, [filteredGraphData])

  useEffect(() => {
    if (loading) return
    const nodeCount = filteredGraphData?.nodes?.length || 0
    const linkCount = filteredGraphData?.links?.length || 0
    if (nodeCount === 0) return

    const focusKey = `${officialSlug}|${selectedYear}|${selectedMethod}|${nodeCount}|${linkCount}`
    if (lastAutoFocusKeyRef.current === focusKey) return
    lastAutoFocusKeyRef.current = focusKey
    const t1 = window.setTimeout(() => {
      fitGraphView()
    }, 120)
    return () => window.clearTimeout(t1)
  }, [loading, filteredGraphData, officialSlug, selectedYear, selectedMethod, visibleNodeIds, fitGraphView])

  return (
    <>
      <Head>
        <title>Connections – {officialSlug.replace(/-/g, " ")}</title>
      </Head>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <header className="bg-blue-900 dark:bg-gray-800 text-white dark:text-gray-100 py-4">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold">Connections Visualization</h1>
            <p className="mt-1">Lobbyists connecting to {officialSlug.replace(/-/g, " ")}</p>
            {officialSlug && (
              <Link
                href={`/officials/${officialSlug}`}
                className="inline-block mt-3 px-4 py-2 rounded-md bg-white/90 text-slate-900 hover:bg-white transition no-underline font-semibold text-sm"
              >
                Back to Official Profile
              </Link>
            )}
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Filters at the top, above the legend */}
          <div className="flex flex-col w-full relative" style={{ zIndex: 10 }}>
            <div className="mb-4 text-center relative" style={{ zIndex: 10 }}>
              <p>
                This force-directed graph shows the connections between lobbyists and {officialSlug.replace(/-/g, " ")},
                based on real lobbying records.
              </p>
              <p>Click on a node to bring you to their page.</p>
            </div>
            <div className="mb-4 flex flex-wrap justify-center gap-4 relative" style={{ zIndex: 10 }}>
              <div>
                <label className="mr-2 font-medium">Year:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
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
                <label className="mr-2 font-medium">Method:</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
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
          <div className="w-full flex flex-col items-center relative" style={{ zIndex: 10 }}>
            <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md shadow-md p-4 mb-4 w-full max-w-2xl relative">
              <h2 className="text-lg font-semibold mb-2">Legend</h2>
              <ul className="space-y-2">
                {LEGEND_CATEGORIES.map((cat, idx) => {
                  let count = 0
                  if (graphData && graphData.links && cat.min === 4) {
                    count = graphData.links.filter((link) => link.count >= 4).length
                  }
                  return (
                    <li
                      key={cat.label}
                      className={`flex items-center gap-2 cursor-pointer select-none rounded px-1 py-0.5 transition border border-transparent ${
                        selectedCategories.includes(idx)
                          ? "bg-blue-200 dark:bg-blue-700 border-blue-400 dark:border-blue-500"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleLegendClick(idx, e)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") handleLegendClick(idx, e)
                        }}
                        aria-pressed={selectedCategories.includes(idx)}
                        className="flex items-center gap-2 w-full text-left bg-transparent border-none p-0 m-0 cursor-pointer focus:outline-none"
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 18,
                            height: 6,
                            background: cat.color,
                            borderRadius: 2
                          }}
                        ></span>
                        <span>
                          {cat.label}
                          {cat.min === 4 && count > 0 ? ` (${count})` : ""}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Click to filter. CTRL+Click to multi-select. Click again to reset.
              </div>
            </div>
          </div>
          {/* Graph container at default z-index */}
          <div
            className="border rounded-md shadow-md flex items-center justify-center w-full relative"
            style={{
              minHeight: "60vh",
              height: "70vh",
              maxHeight: "80vh"
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full text-lg text-blue-700 dark:text-blue-400">
                Loading...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-600 dark:text-red-400">{error}</div>
            ) : (
              <div
                ref={graphWrapRef}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative"
                }}
              >
                <ForceGraph2D
                  ref={fgRef}
                  graphData={filteredGraphData}
                  nodeLabel="id"
                  nodeAutoColorBy="group"
                  minZoom={0.8}
                  maxZoom={8}
                  width={graphSize.width || 800}
                  height={graphSize.height || 600}
                  linkColor={getLinkColor}
                  nodeCanvasObject={nodeCanvasObject}
                  onNodeClick={(node) => {
                    if (
                      fgRef.current &&
                      typeof fgRef.current.centerAt === "function" &&
                      typeof fgRef.current.zoom === "function"
                    ) {
                      fgRef.current.centerAt(node.x, node.y, 1000)
                      fgRef.current.zoom(4, 1000)
                    }
                    // Navigation logic
                    if (node.group === 1) {
                      // Official node
                      const slug = String(node.label || node.id)
                        .trim()
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                      router.push(`/officials/${slug}`)
                    } else {
                      // Lobbyist node
                      const slug = String(node.label || node.id)
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
