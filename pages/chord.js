import Head from "next/head"
import ChordDiagram from "../components/ChordDiagram"
import { useEffect, useState } from "react"
import Select from "react-select"

export default function ChordPage() {
    const [officials, setOfficials] = useState([])
    const [selected1, setSelected1] = useState("")
    const [selected2, setSelected2] = useState("")
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [maxLobbyists, setMaxLobbyists] = useState(10)
    const [startYear, setStartYear] = useState(2015)
    const [endYear, setEndYear] = useState(new Date().getFullYear())
    const [availableYears, setAvailableYears] = useState([])

    // For react-select dropdowns
    const officialOptions = officials.map((name) => ({
        value: name,
        label: name,
    }))
    const selectedOption1 =
        officialOptions.find((o) => o.value === selected1) || null
    const selectedOption2 =
        officialOptions.find((o) => o.value === selected2) || null

    // Fetch all officials for autocomplete and available years
    useEffect(() => {
        fetch("/api/officials/names")
            .then((res) => res.json())
            .then((data) => setOfficials(data.map((o) => o.person_name)))
            .catch(() => setOfficials([]))
        // Fetch available years from the CSVs in /data or hardcode 2015 to current year
        const minYear = 2015
        const maxYear = new Date().getFullYear()
        setAvailableYears(
            Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
        )
        setStartYear(minYear)
        setEndYear(maxYear)
    }, [])

    // Fetch chord data when both officials or time range changes
    useEffect(() => {
        if (!selected1 || !selected2 || selected1 === selected2) return
        setLoading(true)
        setError(null)
        fetch(
            `/api/chord-data?officials=${encodeURIComponent(
                selected1
            )},${encodeURIComponent(
                selected2
            )}&start_year=${startYear}&end_year=${endYear}`
        )
            .then((res) => {
                if (!res.ok) throw new Error("No data found")
                return res.json()
            })
            .then((data) => {
                setRecords(data)
                setLoading(false)
            })
            .catch(() => {
                setError("No data found for these officials")
                setLoading(false)
            })
    }, [selected1, selected2, startYear, endYear])

    return (
        <>
            <Head>
                <title>Compare Two Officials – Chord Diagram</title>
            </Head>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-blue-900 text-white py-4">
                    <div className="max-w-6xl mx-auto px-4 text-center">
                        <h1 className="text-3xl font-bold">
                            Compare Two Officials
                        </h1>
                        <p className="mt-1">
                            Select two officials to compare their lobbying
                            connections.
                        </p>
                    </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 py-8">
                    <div className="mb-8 p-4 bg-white rounded shadow text-left">
                        <h2 className="text-xl font-bold mb-2">
                            About the Chord Diagram
                        </h2>
                        <p className="mb-2">
                            The Chord Diagram lets you compare the lobbying
                            connections of any two Irish officials. Select two
                            officials and a time range to see which lobbyists
                            have interacted with both, and how frequently. The
                            diagram visualizes shared and individual lobbying
                            activity, helping you explore overlaps and
                            relationships in lobbying efforts. Use the filters
                            below to adjust the time period and number of
                            lobbyists shown.
                        </p>
                    </div>
                    <div className="bg-white border rounded-md shadow-md p-8 flex flex-col items-center">
                        <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center">
                            <div>
                                <label className="block mb-1 font-semibold">
                                    Official 1
                                </label>
                                <Select
                                    options={officialOptions}
                                    value={selectedOption1}
                                    onChange={(option) =>
                                        setSelected1(option ? option.value : "")
                                    }
                                    isClearable
                                    isSearchable
                                    placeholder="Select official..."
                                    styles={{
                                        control: (provided) => ({
                                            ...provided,
                                            borderColor: "#CBD5E0",
                                            boxShadow: "none",
                                        }),
                                        menu: (provided) => ({
                                            ...provided,
                                            zIndex: 9999,
                                            maxHeight: "300px",
                                            overflowY: "auto",
                                            backgroundColor: "white",
                                        }),
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-semibold">
                                    Official 2
                                </label>
                                <Select
                                    options={officialOptions}
                                    value={selectedOption2}
                                    onChange={(option) =>
                                        setSelected2(option ? option.value : "")
                                    }
                                    isClearable
                                    isSearchable
                                    placeholder="Select official..."
                                    styles={{
                                        control: (provided) => ({
                                            ...provided,
                                            borderColor: "#CBD5E0",
                                            boxShadow: "none",
                                        }),
                                        menu: (provided) => ({
                                            ...provided,
                                            zIndex: 9999,
                                            maxHeight: "300px",
                                            overflowY: "auto",
                                            backgroundColor: "white",
                                        }),
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-center">
                            <div>
                                <label
                                    htmlFor="startYear"
                                    className="block mb-1 font-semibold"
                                >
                                    Start Year
                                </label>
                                <select
                                    id="startYear"
                                    className="border px-2 py-1 rounded"
                                    value={startYear}
                                    onChange={(e) =>
                                        setStartYear(Number(e.target.value))
                                    }
                                >
                                    {availableYears.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label
                                    htmlFor="endYear"
                                    className="block mb-1 font-semibold"
                                >
                                    End Year
                                </label>
                                <select
                                    id="endYear"
                                    className="border px-2 py-1 rounded"
                                    value={endYear}
                                    onChange={(e) =>
                                        setEndYear(Number(e.target.value))
                                    }
                                >
                                    {availableYears.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-col items-center mb-6">
                            <label
                                htmlFor="maxLobbyists"
                                className="mb-1 font-semibold"
                            >
                                Number of top lobbyists to show: {maxLobbyists}
                            </label>
                            <input
                                id="maxLobbyists"
                                type="range"
                                min={3}
                                max={50}
                                value={maxLobbyists}
                                onChange={(e) =>
                                    setMaxLobbyists(Number(e.target.value))
                                }
                                className="w-64"
                            />
                        </div>
                        {selected1 && selected2 && selected1 === selected2 && (
                            <p className="text-red-600 mb-4">
                                Please select two different officials.
                            </p>
                        )}
                        {loading && <p>Loading data…</p>}
                        {error && <p className="text-red-600">{error}</p>}
                        <div className="w-full flex justify-center items-center min-h-[700px]">
                            {!loading && !error && records.length > 0 && (
                                <ChordDiagram
                                    records={records}
                                    maxLobbyists={maxLobbyists}
                                />
                            )}
                        </div>
                        <p className="mt-4 text-gray-600 text-sm">
                            This diagram shows the relationships between
                            lobbyists and the two selected officials. The
                            thickness of each ribbon represents the number of
                            lobbying records between a lobbyist and an official.
                        </p>
                    </div>
                </main>
            </div>
        </>
    )
}
