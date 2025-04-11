import LobbyingCard from "../../components/LobbyingCard"

export async function getServerSideProps({ params, query }) {
    const page = parseInt(query?.page || 1)
    const res = await fetch(
        `http://localhost:3000/api/officials/${params.slug}?page=${page}`
    )

    if (!res.ok) {
        return { notFound: true }
    }

    const officialData = await res.json()
    return {
        props: {
            officialData,
        },
    }
}

export default function OfficialPage({ officialData }) {
    if (!officialData) return <div>Official not found</div>

    const {
        name,
        slug,
        records = [],
        total = 0,
        page = 1,
        pageSize = 10,
    } = officialData

    const totalPages = Math.ceil(total / pageSize)

    return (
        <div style={{ padding: "2rem" }}>
            <h1>{name}</h1>
            <p>Total Lobbying Efforts: {total}</p>

            <h2>
                Lobbying Records (Page {page} of {totalPages})
            </h2>

            {records.map((record, i) => (
                <LobbyingCard key={i} record={record} />
            ))}

            <div
                style={{
                    marginTop: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                }}
            >
                {page > 1 && (
                    <a href={`/officials/${slug}?page=${page - 1}`}>← Prev</a>
                )}

                {page > 3 && (
                    <>
                        <a href={`/officials/${slug}?page=1`}>1</a>
                        {page > 4 && <span>…</span>}
                    </>
                )}

                {[...Array(5)].map((_, i) => {
                    const p = page - 2 + i
                    if (p < 1 || p > totalPages) return null
                    return (
                        <a
                            key={p}
                            href={`/officials/${slug}?page=${p}`}
                            style={{
                                textDecoration:
                                    p === page ? "underline" : "none",
                                fontWeight: p === page ? "bold" : "normal",
                            }}
                        >
                            {p}
                        </a>
                    )
                })}

                {page < totalPages - 2 && (
                    <>
                        {page < totalPages - 3 && <span>…</span>}
                        <a href={`/officials/${slug}?page=${totalPages}`}>
                            {totalPages}
                        </a>
                    </>
                )}

                {page < totalPages && (
                    <a href={`/officials/${slug}?page=${page + 1}`}>Next →</a>
                )}

                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        const targetPage = parseInt(e.target.page.value)
                        if (
                            targetPage >= 1 &&
                            targetPage <= totalPages &&
                            targetPage !== page
                        ) {
                            window.location.href = `/officials/${slug}?page=${targetPage}`
                        }
                    }}
                    style={{
                        marginLeft: "1rem",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <label style={{ marginRight: "0.5rem" }}>Go to page:</label>
                    <input
                        type="number"
                        name="page"
                        min="1"
                        max={totalPages}
                        defaultValue={page}
                        style={{ width: "60px" }}
                    />
                    <button type="submit" style={{ marginLeft: "0.5rem" }}>
                        Go
                    </button>
                </form>
            </div>
        </div>
    )
}
