# Multi-App Enterprise Developer Console Container
FROM node:20-bookworm-slim

WORKDIR /usr/src/app

# Install build dependencies for native sqlite3 bindings on glibc
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Create data directory for SQLite database
RUN mkdir -p ./data

VOLUME [ "/usr/src/app/data" ]

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD [ "npm", "start" ]
