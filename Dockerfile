# Use an official Node.js runtime as a parent image (Debian-based for easy Python install)
FROM node:20-slim

# Install Python 3, pip, and SQLite3
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Install Python dependencies (using --break-system-packages is safe inside a container)
RUN pip3 install sqlalchemy requests --break-system-packages

# Optimization: Copy parser and data first to cache the database generation
# This prevents re-running the parser when only application code changes
COPY parser.py .
COPY data/ ./data/
RUN python3 parser.py

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Start the application
EXPOSE 3000
CMD ["npm", "start"]