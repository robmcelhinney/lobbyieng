import React, { useRef, useEffect, useState } from "react"
import * as d3 from "d3"

/**
 * ChordDiagram renders a D3 chord diagram for lobbyist-official connections.
 * @param {Array} records - Array of lobbying records: [{ lobbyist_name, dpo_entries:[{person_name, connection_count}], ... }]
 * @param {Array} officials - (Optional) Array of official names, in the order to display as columns
 */
export default function ChordDiagram({
    records,
    officials: officialsProp,
    width = 700,
    height = 700,
    maxLobbyists = 20, // default to top 20 lobbyists
}) {
    const ref = useRef()
    const [tooltip, setTooltip] = useState({
        visible: false,
        x: 0,
        y: 0,
        html: "",
    })

    useEffect(() => {
        if (!records || records.length === 0) return
        // Clear previous SVG
        d3.select(ref.current).selectAll("*").remove()

        // Officials: ensure exactly two, and arrange for opposite sides
        let officials = officialsProp
        if (!officials || officials.length === 0) {
            officials = Array.from(
                new Set(
                    records.flatMap((r) =>
                        r.dpo_entries.map((d) => d.person_name)
                    )
                )
            )
        }
        if (officials.length !== 2) {
            // fallback: just render as before
            officials = officials.slice(0, 2)
        }
        // Place official1 at index 0, official2 at last index
        const official1 = officials[0]
        const official2 = officials[1]
        // Compute top N lobbyists by total connection count to these officials
        const lobbyistTotals = records.map((r) => ({
            name: r.lobbyist_name,
            total: officials.reduce((sum, o) => {
                const entry = r.dpo_entries.find((d) => d.person_name === o)
                return sum + (entry ? entry.connection_count || 1 : 0)
            }, 0),
        }))
        const sortedLobbyists = lobbyistTotals
            .sort((a, b) => b.total - a.total)
            .slice(0, maxLobbyists)
            .map((l) => l.name)
        const lobbyists = sortedLobbyists

        // Build symmetric square matrix: [official1, ...lobbyists, official2]
        const n = lobbyists.length + 2
        const matrix = Array.from({ length: n }, () => Array(n).fill(0))
        lobbyists.forEach((l, i) => {
            const rec = records.find((r) => r.lobbyist_name === l)
            // official1 <-> lobbyist
            const entry1 = rec?.dpo_entries.find(
                (d) => d.person_name === official1
            )
            matrix[0][i + 1] = entry1 ? entry1.connection_count || 1 : 0
            matrix[i + 1][0] = entry1 ? entry1.connection_count || 1 : 0
            // official2 <-> lobbyist
            const entry2 = rec?.dpo_entries.find(
                (d) => d.person_name === official2
            )
            matrix[n - 1][i + 1] = entry2 ? entry2.connection_count || 1 : 0
            matrix[i + 1][n - 1] = entry2 ? entry2.connection_count || 1 : 0
        })

        // D3 chord layout
        const innerRadius = Math.min(width, height) * 0.28 // smaller radius
        const outerRadius = innerRadius + 14
        const svg = d3
            .select(ref.current)
            .attr("viewBox", [0, 0, width, height])
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`)

        // Use d3.schemeTableau10 for distinct, colorblind-friendly palette
        const palette = d3.schemeTableau10
        const color = d3.scaleOrdinal(palette)
        // Labels: [official1, ...lobbyists, official2]
        const labels = [official1, ...lobbyists, official2]
        const chords = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(
            matrix
        )

        // Tooltip helpers
        function showTooltip(html, event) {
            setTooltip({
                visible: true,
                x: event.offsetX + 10,
                y: event.offsetY + 10,
                html,
            })
        }
        function hideTooltip() {
            setTooltip((t) => ({ ...t, visible: false }))
        }

        // Draw outer arcs (groups)
        const group = svg
            .append("g")
            .selectAll("g")
            .data(chords.groups)
            .enter()
            .append("g")

        group
            .append("path")
            .style("fill", (d) => color(d.index))
            .style("stroke", (d) => color(d.index))
            .attr(
                "d",
                d3.arc().innerRadius(innerRadius).outerRadius(outerRadius)
            )
            .on("mousemove", function (event, d) {
                const label = labels[d.index]
                let html = `<strong>${label}</strong><br/>`
                if (d.index === 0 || d.index === labels.length - 1) {
                    // Official
                    const official = label
                    const total = records.reduce((sum, r) => {
                        const entry = r.dpo_entries.find(
                            (e) => e.person_name === official
                        )
                        return sum + (entry ? entry.connection_count || 1 : 0)
                    }, 0)
                    html += `Total lobbying records: <b>${total}</b>`
                } else {
                    // Lobbyist
                    const lobbyist = label
                    const rec = records.find(
                        (r) => r.lobbyist_name === lobbyist
                    )
                    html += `Total with ${official1}: <b>${
                        rec?.dpo_entries.find(
                            (d) => d.person_name === official1
                        )?.connection_count || 0
                    }</b><br/>`
                    html += `Total with ${official2}: <b>${
                        rec?.dpo_entries.find(
                            (d) => d.person_name === official2
                        )?.connection_count || 0
                    }</b>`
                }
                showTooltip(html, event)
            })
            .on("mouseout", hideTooltip)

        // Add labels (smaller font, truncate if needed)
        group
            .append("text")
            .each((d) => {
                d.angle = (d.startAngle + d.endAngle) / 2
            })
            .attr("dy", ".28em")
            .attr(
                "transform",
                (d) =>
                    `rotate(${(d.angle * 180) / Math.PI - 90}) translate(${
                        outerRadius + 6
                    })${d.angle > Math.PI ? " rotate(180)" : ""}`
            )
            .attr("text-anchor", (d) => (d.angle > Math.PI ? "end" : null))
            .style("font-size", "16px") // Increased font size
            .text((d) => {
                const label = labels[d.index]
                if (!label) return ""
                return label.length > 18 ? label.slice(0, 16) + "…" : label
            })

        // Draw chords (ribbons)
        svg.append("g")
            .attr("fill-opacity", 0.67)
            .selectAll("path")
            .data(chords)
            .enter()
            .append("path")
            .attr("d", d3.ribbon().radius(innerRadius))
            .style("fill", (d) => color(d.target.index))
            .style("stroke", (d) => d3.rgb(color(d.target.index)).darker())
            .on("mousemove", function (event, d) {
                const idx0 = 0
                const idxLast = labels.length - 1
                const labelSource = labels[d.source.index]
                const labelTarget = labels[d.target.index]
                const value = matrix[d.source.index][d.target.index]
                let lobbyist, official
                if (d.source.index !== idx0 && d.source.index !== idxLast) {
                    // source is lobbyist
                    lobbyist = labelSource
                    official = labelTarget
                } else {
                    // target is lobbyist
                    lobbyist = labelTarget
                    official = labelSource
                }
                let html = `<strong>${lobbyist} → ${official}</strong><br/>`
                html += `Lobbying records: <b>${value}</b>`
                showTooltip(html, event)
            })
            .on("mouseout", hideTooltip)
    }, [records, officialsProp, width, height, maxLobbyists])

    const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-x-auto">
            <svg
                ref={ref}
                width={width}
                height={height}
                style={{ maxWidth: "100%", height: "auto", minWidth: 350 }}
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
            />
            {tooltip.visible && (
                <div
                    className={`absolute text-sm rounded-md px-3 py-2 max-w-xs pointer-events-none z-50 shadow-lg transition-opacity duration-200 ${
                        prefersDark
                            ? "bg-gray-800 text-gray-100"
                            : "bg-white text-gray-900 border border-gray-300"
                    }`}
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                    }}
                    dangerouslySetInnerHTML={{ __html: tooltip.html }}
                />
            )}
        </div>
    )
}
