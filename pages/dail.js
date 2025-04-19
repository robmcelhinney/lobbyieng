import { useState, useEffect } from "react";
import Link from "next/link";
import Select from "react-select";
import Head from "next/head";

const topOfficialsTitles = [
  "TD",
  "An Tánaiste",
  "An Taoiseach",
  "Minister",
  "Minister of State",
  "Tánaiste and Minister",
];

export async function getServerSideProps(context) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (context.req ? `https://${context.req.headers.host}` : "");
  try {
    const periodsRes = await fetch(`${baseUrl}/api/periods`);
    const periodsJson = periodsRes.ok
      ? await periodsRes.json()
      : { periods: [] };
    const allPeriods = periodsJson.periods || [];

    const latestRes = await fetch(`${baseUrl}/api/periods-latest`);
    const latestJson = latestRes.ok ? await latestRes.json() : {};
    const latestPeriod = latestJson.period || allPeriods.at(-1) || "";

    const jobTitlesParam = topOfficialsTitles.join(",");
    const res = await fetch(
      `${baseUrl}/api/officials?period=${encodeURIComponent(
        latestPeriod,
      )}&job_titles=${encodeURIComponent(jobTitlesParam)}`,
    );
    if (!res.ok) throw new Error("API failed");
    const officials = await res.json();
    return { props: { officials, allPeriods, latestPeriod } };
  } catch (err) {
    console.error("Error fetching officials or periods:", err);
    return { props: { officials: [], allPeriods: [], latestPeriod: "" } };
  }
}

function dedupedOfficials(array) {
  return Array.from(new Map(array.map((item) => [item.slug, item])).values());
}

export default function Index({
  officials: initialOfficials,
  allPeriods,
  latestPeriod,
}) {
  const [selectedPeriod, setSelectedPeriod] = useState(latestPeriod);
  const [selectedName, setSelectedName] = useState(null);
  const [officials, setOfficials] = useState(initialOfficials);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const jobTitlesParam = topOfficialsTitles.join(",");
    const url = selectedPeriod
      ? `/api/officials?period=${encodeURIComponent(
          selectedPeriod,
        )}&job_titles=${encodeURIComponent(jobTitlesParam)}`
      : `/api/officials?period=All&job_titles=${encodeURIComponent(
          jobTitlesParam,
        )}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setOfficials(data))
      .finally(() => setIsLoading(false));
  }, [selectedPeriod]);

  const filtered = officials.filter((o) => {
    return selectedName ? o.name === selectedName.value : true;
  });
  const deduped = dedupedOfficials(filtered);
  const nameOptions = deduped.map((o) => ({ value: o.name, label: o.name }));

  return (
    <>
      <Head>
        <title>Lobbyieng - Dáil</title>
        <meta
          name="description"
          content="Search and explore Irish Dáil members and lobbying activity. Filter by period, name, and job title."
        />
        <meta property="og:title" content="Lobbyieng - Dáil" />
        <meta
          property="og:description"
          content="Search and explore Irish Dáil members and lobbying activity. Filter by period, name, and job title."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://lobbyieng.com/dail" />
        <meta property="og:image" content="/android-chrome-512x512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Lobbyieng - Dáil" />
        <meta
          name="twitter:description"
          content="Search and explore Irish Dáil members and lobbying activity. Filter by period, name, and job title."
        />
        <meta name="twitter:image" content="/android-chrome-512x512.png" />
      </Head>
      <div className="min-h-screen bg-cb-light-background dark:bg-cb-dark-background text-cb-light-text dark:text-cb-dark-text">
        {isLoading && (
          <div className="w-full h-1 bg-blue-200 dark:bg-blue-900">
            <div className="h-1 bg-blue-600 dark:bg-blue-400 animate-pulse w-full"></div>
          </div>
        )}

        <header className="bg-blue-900 dark:bg-gray-800 text-white dark:text-gray-100 py-4 shadow">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold">
              Elected Officials – Lobbying Data
            </h1>
            <p className="mt-2 text-lg">
              Search for your favourite member of the Dáil.
            </p>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-md p-6 mb-6 flex flex-col sm:flex-row gap-6 items-center">
            <div className="w-50">
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 shadow-sm bg-white dark:bg-gray-700 text-cb-light-text dark:text-cb-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Periods</option>
                {allPeriods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-64 accent-blue-600 dark:accent-blue-400">
              <label className="block text-sm font-medium text-cb-light-text dark:text-cb-dark-text mb-1">
                Name
              </label>
              <Select
                options={nameOptions}
                value={selectedName}
                onChange={setSelectedName}
                isClearable
                placeholder="Search by name..."
                styles={{
                  control: (base) => ({
                    ...base,
                    backgroundColor: "hsl(var(--cb-light-background))",
                    borderColor: "#CBD5E0",
                    color: "#111",
                  }),
                  menu: (base) => ({
                    ...base,
                    backgroundColor: "#fff",
                    color: "#111",
                    zIndex: 9999,
                  }),
                }}
              />
            </div>

            {(selectedPeriod || selectedName) && (
              <div>
                <button
                  onClick={() => {
                    setSelectedPeriod("");
                    setSelectedName(null);
                  }}
                  className="text-red-600 dark:text-red-400 underline text-sm"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          <section className="bg-white dark:bg-gray-800 rounded-md shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Officials ({isLoading ? "..." : deduped.length} results)
            </h2>
            {isLoading ? (
              <div className="text-center text-blue-600 dark:text-blue-300 py-8">
                Loading officials...
              </div>
            ) : deduped.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {deduped.map((official) => (
                  <li
                    key={official.slug}
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md p-4 hover:shadow transition"
                  >
                    <Link legacyBehavior href={`/officials/${official.slug}`}>
                      <a>
                        <h3 className="font-bold text-cb-light-text dark:text-cb-dark-text">
                          {official.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {official.job_title}
                        </p>
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No results found.
              </p>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
