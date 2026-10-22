# one-zero-two

## Requirements

- Node.js 20.19+ or 22.12+
- npm

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
Copy-Item .env.example .env
npm run db:push
npm run dev
```

The API runs at `http://localhost:3000`. The Vite development server proxies `/api` requests to it. The initial Prisma schema uses SQLite; edit `backend/prisma/schema.prisma` to add models, then run `npm run db:push` to sync the local database.

## Install on a phone

Deploy the frontend over HTTPS, then open its URL on your phone. On Android, use the browser menu and choose **Install app** or **Add to Home screen**. On iPhone, open the site in Safari, tap **Share**, then **Add to Home Screen**. The production build includes the web app manifest and offline app shell; the Vite development server is for local development, not phone installation.