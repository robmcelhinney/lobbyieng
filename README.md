**Lobbyieng**

Lobbyieng visualises lobbying activity in Ireland. It scrapes the official Register of Lobbying, links records to elected officials, and presents it in a searchable, interactive UI.

## 🚀 Features

-   Browse records by official or lobbyist
-   Filter by year, method (meetings, emails, calls, etc.), job title, or name
-   Force‑directed graph of connections (react‑force‑graph‑2d)
-   Chord diagram to compare two officials
-   Pie charts for method breakdown (Chart.js)

## 🔧 Tech Stack

-   **Framework:** Next.js (SSR + API routes)
-   **UI:** React, Tailwind CSS, react-select
-   **Data:** SQLite (lobbying.db)
-   **Charts:** react-chartjs-2, react-force-graph-2d

## ⚙️ Getting Started

### Prerequisites

-   Node.js ≥14
-   npm or yarn
-   Python ≥3.8
-   SQLite3
-   Required Python packages: `sqlalchemy`, `requests`

### Clone & Install

```bash
git clone https://github.com/robmcelhinney/lobbyieng.git
cd lobbyieng
npm install     # or yarn
```

### 📦 Build the Database (`lobbying.db`)

1. Select relevant data from https://www.lobbying.ie/app/home/search by using CSV export
1. Store CSVs in the `data/` directory.
1. Run the parser to ingest CSVs into SQLite:

    ```bash
    python parser.py
    ```

    - This script (`parser.py`) drops and recreates tables, normalises names, and populates:
        - `lobbying_records`
        - `dpo_entries`
        - `lobbying_activity_entries`

1. After ingesting, indexes are created automatically for faster queries.

### 🖼️ Fetch Dáil Thumbnails (optional)

To download member images into `td_thumbnails/`:

```bash
python download-dail-images.py
```

### Run the App

```bash
npm run dev
# Visit http://localhost:3000
```

## 🛠️ API Endpoints

-   **GET** `/api/officials?period=All&job_titles=TD,Minister` — list officials
-   **GET** `/api/officials/[slug]?[page,year,method,lobbyist,per_page]` — detail + filters
-   **GET** `/api/officials/[slug]/methods` — method breakdown
-   **GET** `/api/lobbyists?period=` — list lobbyists
-   **GET** `/api/lobbyists/[slug]?[page,year,method,official]` — lobbyist detail
-   **GET** `/api/chord-data?officials=slug1,slug2&start_year&end_year` — chord JSON
-   **GET** `/api/periods` — all periods
-   **GET** `/api/periods-latest` — latest period

## 📖 Pages

-   **/** Home overview
-   **/dail** Search Dáil members
-   **/officials** Browse officials
-   **/officials/[slug]** Official detail
-   **/lobbyists** Browse lobbyists
-   **/lobbyists/[slug]** Lobbyist detail
-   **/chord** Compare two officials
-   **/connections/[slug]** Force graph
-   **/methods/[slug]** Pie chart

## 🤝 Contributing

1. Fork it
1. Create a branch (`git checkout -b feature/XYZ`)
1. Commit (`git commit -m "feat: add XYZ"`)
1. Push (`git push origin feature/XYZ`)
1. Open a PR

## 📜 License

MIT © Robert McElhinney
