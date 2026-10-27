# one-zero-two

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- Docker Desktop or Docker Engine with Compose

## Start everything

From the repository root, with Docker running:

```sh
npm run install:all   # first time only
npm run dev           # PostgreSQL + API (backend) and Vite (frontend) together
npm run set-code      # set a user's 6-digit access code (run once per person)
```

The sections below describe starting each part on its own.

## Start the frontend

```sh
cd frontend
npm install
npm run dev
```

## Start the backend

```sh
cd backend
npm install
npm run dev
```

With Docker Desktop or Docker Engine running, `npm run dev` starts PostgreSQL in Docker, waits for it to become healthy, syncs the Prisma schema, then starts the API at `http://localhost:3000`. The Vite development server proxies `/api` requests to the API. The checked-in `.env.example` uses local development credentials; if you do not already have a `.env`, copy it with `Copy-Item .env.example .env`. Edit `prisma/schema.prisma` to add models. Run `npm run db:down` to stop PostgreSQL; its data persists in a Docker volume.

The previous local database used SQLite. Switching the provider does not migrate existing SQLite data into PostgreSQL.

## Install on a phone

Deploy the frontend over HTTPS, then open its URL on your phone. On Android, use the browser menu and choose **Install app** or **Add to Home screen**. On iPhone, open the site in Safari, tap **Share**, then **Add to Home Screen**. The production build includes the web app manifest and offline app shell; the Vite development server is for local development, not phone installation.