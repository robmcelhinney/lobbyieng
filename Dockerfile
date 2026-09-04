# Debian-based for easy Python install
FROM node:24-slim

# System deps (cached unless changed). build-essential stays so the sqlite3
# native module can compile if no prebuild exists for this Node version.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    sqlite3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# uv for Python deps (matches the local `uv sync` workflow)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install JS deps first (cached unless package manifests change)
COPY package.json package-lock.json ./
RUN npm ci && npm rebuild sqlite3 --build-from-source

# Install Python deps (cached unless Python manifests change)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

# Build the database (re-runs only when data or the parser changes).
# Requires Register CSV exports in data/; optionally refresh
# data/derived/committee_memberships.json beforehand (see README).
COPY parser.py ./
COPY data/ ./data/
RUN uv run python parser.py

# App code + production build (DB path explicit so runtime reads the built DB)
COPY . .
ENV SQLITE_DB_PATH=/app/lobbying.db
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
