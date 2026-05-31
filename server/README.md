# Prompty MCP Server

This server exposes two tool groups:

1. **Dynamic skill tools** loaded from `skills.json`
2. **Static librosa tools** for production audio workflows:
   - `analyze_audio`
   - `batch_analyze_audio`
   - `find_similar_tracks`

## Prerequisites

- Node.js 18+
- Python 3.9+
- The librosa skill scripts directory available on disk

By default, the server expects scripts at:

`/home/workdir/.grok/skills/librosa-audio-analysis/scripts`

Override with `LIBROSA_SCRIPTS_DIR`.

## Environment variables

- `PORT` (default: `3000`)
- `PYTHON_BIN` (default: `python3`)
- `LIBROSA_SCRIPTS_DIR` (default path above)

## Run locally

Install dependencies:

- `npm --prefix server install`

Start server:

- `npm --prefix server start`

Dev mode (watch):

- `npm --prefix server run dev`

Health endpoint:

- `GET http://localhost:3000/`

MCP SSE endpoint:

- `http://localhost:3000/sse`

## Tool usage (MCP arguments)

### 1) `analyze_audio`

```json
{
  "inputFile": "./audio/my_song.mp3",
  "outputDir": "./reports",
  "timeoutMs": 600000
}
```

### 2) `batch_analyze_audio`

```json
{
  "inputFiles": ["./tracks/a.mp3", "./tracks/b.mp3", "./tracks/c.mp3"],
  "outputDir": "./batch_reports",
  "workers": 8,
  "timeoutMs": 900000
}
```

### 3) `find_similar_tracks`

```json
{
  "queryFile": "./query.mp3",
  "libraryFiles": ["./library/a.mp3", "./library/b.mp3", "./library/c.mp3"],
  "topK": 5,
  "timeoutMs": 600000
}
```

## Operational notes

- If port `3000` is busy, run with `PORT=3010 npm --prefix server start`.
- Tool calls fail early if required Python scripts are missing.
- Long-running Python work is bounded by per-tool timeout.

## Deployment

- VM/systemd deployment: use `server/deploy.sh`
- Vercel/Next.js deployment variant: see `server/vercel-nextjs-mcp/README.md`
