export async function getServerSideProps({ params }) {
    const res = await fetch(
        `http://localhost:3000/api/officials/${params.slug}`
    )
    if (res.status !== 200) {
        return { notFound: true }
    }
    const officialData = await res.json()
    return { props: { officialData } }
}

export default function OfficialPage({ officialData }) {
    return (
        <div style={{ padding: "2rem" }}>
            <h1>{officialData.name}</h1>
            <p>Total Lobbying Efforts: {officialData.total}</p>
            <h2>Lobbying Records</h2>
            <ul>
                {officialData.records.map((record, i) => (
                    <li key={i}>
                        {/* Focus on displaying the lobbyist_name field and any additional details */}
                        <strong>
                            {record.period}: {record.lobbyist_name} -{" "}
                            {record.intended_results}
                        </strong>
                        : {record.specific_details}
                    </li>
                ))}
            </ul>
        </div>
    )
}
