# Irish Lobbying Data Explorer

A web application for exploring, searching, and visualizing lobbying returns in Ireland. Built with Next.js, Tailwind CSS, and React, this project provides interactive tools to browse lobbying activities, officials, lobbyists, and their connections.

## Features

-   Browse and search lobbying returns from 2015 – 2025
-   Visualize connections between lobbyists and officials
-   Interactive chord diagrams and data cards
-   Detailed views for lobbyists, officials, and lobbying methods
-   Responsive, accessible UI with dark mode support

## Getting Started

### Prerequisites

-   Node.js (18.x or later recommended)
-   npm, yarn, pnpm, or bun

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/robmcelhinney/lobbyieng.git
cd lobbyieng
npm install
# or
yarn install
# or
bun install
```

Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
bun dev
```

Open http://localhost:3000 in your browser to view the app.

Building for Production

```bash
npm run build
npm start
```

### Project Structure

-   components/ – React components for UI and data display
-   pages/ – Next.js pages and API routes
-   data/ – CSV datasets of lobbying returns (2015–2025)
-   public/ – Static assets and images
-   styles/ – Global and Tailwind CSS styles
-   parser.py – Python script for data processing

### Data Sources

Lobbying return data is sourced from lobbying.ie. See the data/ directory for included CSV files.

### Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, features, or improvements.

### Fork the repository

1. Create a new branch (git checkout -b feature/your-feature)
1. Commit your changes
1. Push to your fork and open a pull request

### License

This project is licensed under the MIT License.

For questions or feedback, please open an issue.
