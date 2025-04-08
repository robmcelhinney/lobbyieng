import Link from "next/link"

export async function getServerSideProps() {
    const res = await fetch("http://localhost:3000/api/officials")
    const officials = await res.json()
    return { props: { officials } }
}

export default function Index({ officials }) {
    return (
        <div style={{ padding: "2rem" }}>
            <h1>Elected Officials (DPOs Lobbied) – Lobbying Data</h1>
            <ul>
                {officials.map((official) => (
                    <li key={official.slug}>
                        <Link href={`/officials/${official.slug}`}>
                            {official.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}
