# Prompty

Prompt/skill designer UI + MCP server for dynamic tools and audio analysis workflows.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## What is Prompty?

Prompty combines two powerful pieces:

1. **Frontend UI** (`Backup Quest`) — A polished, game-like React demo for a 3-step forensic-style workflow (upload → select contact → choose output format). Built with Vite + React 19 + TypeScript.

2. **MCP Server** (`prompty-mcp-server`) — A production-ready Model Context Protocol server that exposes:
   - **Dynamic skills** loaded from `server/skills.json` (supporting variables `{{var}}` and chained skills `[[Skill Name]]`)
   - **Static high-value tools** for audio analysis (powered by librosa/Python):
     - `analyze_audio`
     - `batch_analyze_audio`
     - `find_similar_tracks`

The browser app can be used to design and export skills that the MCP server then serves to AI agents (Claude, Grok, Cursor, etc.).

## Features

- ✨ Skill designer workflow with variable interpolation and skill chaining
- 🔌 Full MCP SSE transport (`/sse` endpoint)
- 🎵 Production audio analysis tools with timeout protection
- 📦 One-command local development
- 🚀 Ready for VM/systemd or Vercel deployment
- 🛡️ Privacy-first demo UI (everything runs client-side)

## Project Structure

```
prompty/
├── src/                    # React frontend (Backup Quest demo)
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── server/                 # MCP + Express server
│   ├── index.js            # Main MCP server (dynamic skills + librosa tools)
│   ├── skills.json         # Your exported skills
│   ├── package.json
│   └── vercel-nextjs-mcp/  # Alternative Vercel deployment
├── package.json            # Frontend (Vite)
├── vite.config.ts
└── vercel.json
```

## Getting Started

### Frontend (UI)

```bash
npm install
npm run dev
```

Open http://localhost:5173

### MCP Server

```bash
cd server
npm install

# Start in production mode
npm start

# Or development mode (auto-restart)
npm run dev
```

Server runs on port `3000` by default.

**Health check:** `GET http://localhost:3000/`

**MCP endpoint:** `http://localhost:3000/sse`

### Environment Variables (Server)

| Variable               | Default                                              | Description |
|------------------------|------------------------------------------------------|-----------|
| `PORT`                 | `3000`                                               | Server port |
| `PYTHON_BIN`           | `python3`                                            | Python executable |
| `LIBROSA_SCRIPTS_DIR`  | `/home/workdir/.grok/skills/librosa-audio-analysis/scripts` | Path to librosa Python scripts |

## Using Skills

Skills in `server/skills.json` support:

- **Variables**: `{{style}}`, `{{word_limit}}`, `{{text}}`
- **Chaining**: `[[Other Skill Name]]` inside instructions (recursive resolution)

Example skill:

```json
{
  "id": "summarizer",
  "name": "Summarize Text",
  "instructions": "Summarize the following in a {{style}} style:\n\n{{text}}"
}
```

The server automatically turns every skill into a callable MCP tool.

## Audio Analysis Tools

The server also registers three powerful audio tools (requires the librosa scripts):

- `analyze_audio` — Single track analysis
- `batch_analyze_audio` — Parallel batch processing
- `find_similar_tracks` — Similarity search against a library

See `server/README.md` for full argument examples.

## Deployment

- **Traditional**: Use `server/deploy.sh` for systemd/VM setups
- **Vercel**: See `server/vercel-nextjs-mcp/README.md` for the Next.js MCP adapter variant

## Development

```bash
# Frontend only
npm run dev

# Server (watch mode)
npm --prefix server run dev

# Build frontend
npm run build
```

## Keyboard Shortcuts (UI)

- `Enter` — Start backup scan (Step 1)
- `?` — Jump to contact selection (dev/testing)

## License

MIT

---

Built for powerful prompt engineering and real-world audio intelligence workflows.
