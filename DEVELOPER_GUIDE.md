# MarketVerse Developer Guide

## Runtime Contract

MarketVerse is a Node.js 20+ full-stack application.

- Development URL: `http://localhost:5173`
- Production URL: `http://localhost:3000`
- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- HTTP server: Hono in `api/boot.ts`
- Typed API: tRPC under `/api/trpc`
- Synchronous AI API: `/api/ai/chat`
- Database: MySQL 8 through `mysql2/promise`
- Optional AI provider: OpenAI through `OPENAI_API_KEY`
- Optional local model provider: Ollama through `OLLAMA_URL`

The development Vite plugin runs the Hono app as middleware, so frontend and API requests share port 5173. Production builds the frontend into `dist/public` and the server into `dist/boot.js`.

## First Run

From the repository root, run one command:

```bash
npm run setup
```

The setup command:

1. Verifies Node.js 20+.
2. Creates `.env` only when it does not already exist.
3. Installs the exact dependency versions with `npm ci`.
4. Starts the MySQL service with Docker Compose when Docker is available.
5. Waits for MySQL to accept connections.
6. Seeds the database without overwriting an existing populated database.
7. Warns if `OPENAI_API_KEY` is empty.
8. Pulls `qwen2.5:3b-instruct` and `nomic-embed-text` when Ollama is installed.
9. Starts the development server.

If Docker is unavailable, install MySQL 8 yourself and set `DATABASE_URL` in `.env` before running setup. Ollama is also an OS-level prerequisite for the local LLM path; install it from [ollama.com](https://ollama.com), then rerun setup to download the models.

## Daily Commands

| Command | Purpose |
| --- | --- |
| `npm run setup` | First-time setup, database preparation, and dev server |
| `npm run dev` | Start the existing local development environment |
| `npm run build` | Build frontend and production server |
| `npm run start` | Run the production bundle after `npm run build` |
| `npm run check` | TypeScript project check |
| `npm run lint` | ESLint validation |
| `npm test` | Vitest tests |
| `npm run db:seed` | Seed an empty database; preserves populated data |
| `npm run db:seed -- --force` | Destructively reset and reseed the database |
| `docker compose up -d db` | Start only the local MySQL container |
| `docker compose down` | Stop local containers; named database data remains |

## Environment

`.env` is local-only and ignored by Git. Start from `.env.example` or let `npm run setup` create it.

Required for normal local startup:

- `DATABASE_URL`
- `APP_SECRET`
- `APP_ID`

Required for API-backed AI behavior:

- `OPENAI_API_KEY`

Optional integrations:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `SSLCOMMERZ_IS_LIVE`
- `KIMI_AUTH_URL`, `KIMI_OPEN_URL`, `VITE_KIMI_AUTH_URL`, `VITE_APP_ID`
- `OLLAMA_URL`, `OLLAMA_MODEL`, `OLLAMA_FALLBACK_MODEL`, `OLLAMA_MAX_TOKENS`, `EMBEDDING_MODEL`

Never place secrets in `VITE_*` variables unless they are intentionally public. Never commit `.env`.

## Where Code Belongs

- `src/`: browser UI, pages, hooks, providers, and browser utilities.
- `api/`: HTTP bootstrap, tRPC routers, auth, payments, and API adapters.
- `server/ai/`: server-side AI orchestration, classification, memory, tools, RAG, and LLM adapters.
- `db/`: MySQL schema, connection layer, AI schema, and seed/clear utilities.
- `contracts/`: shared API constants, errors, and types.
- `scripts/`: intentional maintenance and data-generation commands. Setup is `scripts/setup.mjs`.
- `public/`: static assets and runtime uploads.
- `docs/`: deeper architecture and operational documentation.
- `scratch/`, `tmp/`, `dist/`, and `node_modules/`: local/generated areas; do not edit or commit them.

When changing behavior, start at the owning boundary: UI in `src`, HTTP wiring in `api`, domain orchestration in `server`, persistence in `db`.

## Troubleshooting

### Port 5173 is busy

Stop the process using port 5173, then run `npm run dev` again. The project intentionally uses strict port binding so a wrong server is not mistaken for MarketVerse.

### MySQL connection fails

Check that Docker is running and execute `docker compose up -d db`, or verify the host, port, user, password, and database in `DATABASE_URL`. Then run `npm run db:seed`.

### AI returns a fallback

Check that `.env` contains a valid `OPENAI_API_KEY`, restart the dev server, and inspect the terminal for OpenAI status codes. A `429` means the OpenAI account has exhausted quota or rate limits; it is not a browser microphone failure.

### TypeScript check fails

Run `npm run check` and fix errors in the files named by the compiler. The check is repository-wide; existing unrelated errors should be tracked separately from a focused feature change.

## Production

```bash
npm ci
npm run build
npm run start
```

For the complete MySQL-backed production stack:

```bash
docker compose up --build
```

Set production secrets through the deployment platform, not through committed files. See `DEPLOY.md` for Railway, Render, VPS, and Docker deployment notes.
