# Local Bootstrap

Use the canonical cross-platform setup command from the repository root:

```bash
npm run setup
```

It creates a local `.env`, installs the locked dependencies, starts MySQL with Docker Compose when available, waits for the database, seeds it, and starts the development server at `http://localhost:5173`.

`npm run dev` alone only starts Vite. It does not install Node.js, Docker, MySQL, Ollama, or model weights.

Requirements:

- Node.js 20 or newer
- Docker Desktop with Compose, or an existing MySQL 8 server
- Ollama for the local LLM path; setup pulls `qwen2.5:3b-instruct` and `nomic-embed-text` when Ollama is installed

If Docker is unavailable, set `DATABASE_URL` in `.env` to your MySQL server and run the same command. Add `OPENAI_API_KEY` to `.env` to enable API-backed AI features.

See `DEVELOPER_GUIDE.md` for the project structure, environment reference, daily commands, and troubleshooting.
