import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { readFileSync, existsSync } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { z } from "zod";

const __dir = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);
const SKILLS_PATH = join(__dir, "skills.json");
const PYTHON_BIN = process.env.PYTHON_BIN || "python3";
const LIBROSA_SCRIPTS_DIR = process.env.LIBROSA_SCRIPTS_DIR || "/home/workdir/.grok/skills/librosa-audio-analysis/scripts";

// ── Skill helpers (mirrors browser app logic) ─────────────────────────────────

function loadSkills() {
  if (!existsSync(SKILLS_PATH)) {
    console.warn("skills.json not found — export skills from the browser app and drop the file here.");
    return [];
  }
  try {
    return JSON.parse(readFileSync(SKILLS_PATH, "utf8"));
  } catch (e) {
    console.error("Failed to parse skills.json:", e.message);
    return [];
  }
}

function extractParams(text) {
  return [...new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];
}

function resolveChains(text, skills, visited = new Set()) {
  return text.replace(/\[\[([^\]]+)\]\]/g, (match, name) => {
    const skill = skills.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
    if (!skill || visited.has(skill.id)) return match;
    visited.add(skill.id);
    return resolveChains(skill.instructions, skills, new Set(visited));
  });
}

function resolvePrompt(instructions, args, skills) {
  const text = resolveChains(instructions, skills);
  return text.replace(/\{\{(\w+)\}\}/g, (_, p) => (args[p] != null ? String(args[p]) : `{{${p}}}`));
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/, "") || "skill";
}

function getScriptPath(scriptName) {
  return join(LIBROSA_SCRIPTS_DIR, scriptName);
}

function ensureScriptExists(scriptName) {
  const scriptPath = getScriptPath(scriptName);
  if (!existsSync(scriptPath)) {
    throw new Error(
      `Required script not found: ${scriptPath}. Set LIBROSA_SCRIPTS_DIR to the folder that contains ${scriptName}.`,
    );
  }
  return scriptPath;
}

async function runPythonScript(scriptPath, scriptArgs, timeoutMs = 10 * 60 * 1000) {
  return await new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [scriptPath, ...scriptArgs], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let killedForTimeout = false;

    const timer = setTimeout(() => {
      killedForTimeout = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);

      if (killedForTimeout) {
        reject(new Error(`Process timed out after ${timeoutMs}ms for ${scriptPath}`));
        return;
      }

      if (code !== 0) {
        reject(
          new Error(
            `Python script failed (${scriptPath}) with code=${code ?? "null"}, signal=${signal ?? "none"}\n${stderr || stdout}`,
          ),
        );
        return;
      }

      resolve({
        command: `${PYTHON_BIN} ${scriptPath} ${scriptArgs.join(" ")}`,
        code,
        signal,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

function toTextResult(title, payload) {
  return {
    content: [
      {
        type: "text",
        text: `${title}\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  };
}

function registerLibrosaTools(server) {
  server.tool(
    "analyze_audio",
    "Run single-track librosa analysis and generate report artifacts.",
    {
      inputFile: z.string().describe("Path to input audio file, e.g. ./audio/song.mp3"),
      outputDir: z.string().describe("Directory for reports/plots/json output"),
      timeoutMs: z.number().int().positive().max(3600000).optional().describe("Optional timeout in milliseconds (default 600000)"),
      extraArgs: z.array(z.string()).optional().describe("Optional passthrough CLI args for analyze_audio.py"),
    },
    async (args) => {
      const scriptPath = ensureScriptExists("analyze_audio.py");
      const scriptArgs = [args.inputFile, args.outputDir, ...(args.extraArgs ?? [])];
      const result = await runPythonScript(scriptPath, scriptArgs, args.timeoutMs);

      return toTextResult("analyze_audio completed", {
        inputFile: args.inputFile,
        outputDir: args.outputDir,
        ...result,
      });
    },
  );

  server.tool(
    "batch_analyze_audio",
    "Run parallel librosa analysis for multiple tracks and generate aggregate summaries.",
    {
      inputFiles: z.array(z.string()).min(1).describe("List of files to analyze"),
      outputDir: z.string().describe("Output folder for batch artifacts"),
      workers: z.number().int().min(1).max(64).optional().describe("Parallel worker count, e.g. 8"),
      timeoutMs: z.number().int().positive().max(3600000).optional().describe("Optional timeout in milliseconds (default 600000)"),
      extraArgs: z.array(z.string()).optional().describe("Optional passthrough CLI args for batch_analyze.py"),
    },
    async (args) => {
      const scriptPath = ensureScriptExists("batch_analyze.py");
      const workerArgs = args.workers ? ["--workers", String(args.workers)] : [];
      const scriptArgs = [...args.inputFiles, "--output", args.outputDir, ...workerArgs, ...(args.extraArgs ?? [])];
      const result = await runPythonScript(scriptPath, scriptArgs, args.timeoutMs);

      return toTextResult("batch_analyze_audio completed", {
        inputCount: args.inputFiles.length,
        outputDir: args.outputDir,
        workers: args.workers ?? null,
        ...result,
      });
    },
  );

  server.tool(
    "find_similar_tracks",
    "Run content-based similarity search against an audio library.",
    {
      queryFile: z.string().describe("Reference/query track path"),
      libraryFiles: z.array(z.string()).min(1).describe("Candidate library tracks to compare against"),
      topK: z.number().int().min(1).max(100).optional().describe("How many top similar tracks to return"),
      timeoutMs: z.number().int().positive().max(3600000).optional().describe("Optional timeout in milliseconds (default 600000)"),
      extraArgs: z.array(z.string()).optional().describe("Optional passthrough CLI args for audio_similarity.py"),
    },
    async (args) => {
      const scriptPath = ensureScriptExists("audio_similarity.py");
      const topK = args.topK ?? 5;
      const scriptArgs = [args.queryFile, ...args.libraryFiles, "--top-k", String(topK), ...(args.extraArgs ?? [])];
      const result = await runPythonScript(scriptPath, scriptArgs, args.timeoutMs);

      return toTextResult("find_similar_tracks completed", {
        queryFile: args.queryFile,
        libraryCount: args.libraryFiles.length,
        topK,
        ...result,
      });
    },
  );
}

// ── Build McpServer from skills ───────────────────────────────────────────────
// Called fresh on each SSE connection so skills.json changes are picked up.

function buildMcpServer(skills) {
  const server = new McpServer({ name: "prompty", version: "1.0.0" });
  const usedNames = new Set();

  registerLibrosaTools(server);

  for (const skill of skills) {
    let name = slugify(skill.name);
    let attempt = name;
    let n = 2;
    while (usedNames.has(attempt)) attempt = `${name}_${n++}`;
    usedNames.add(attempt);

    const params = extractParams(skill.instructions);
    const shape = {};
    for (const p of params) {
      shape[p] = z.string().optional().describe(`Value for {{${p}}}`);
    }

    const description = (skill.instructions.split("\n")[0] ?? skill.name).slice(0, 200);
    const capturedSkill = skill;

    server.tool(attempt, description, shape, async (args) => ({
      content: [{ type: "text", text: resolvePrompt(capturedSkill.instructions, args, skills) }],
    }));
  }

  return server;
}

// ── Express ───────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Allow Grok and browser clients
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Session map: sessionId -> SSEServerTransport
const sessions = new Map();

// Client connects here — opens the SSE stream
app.get("/sse", async (req, res) => {
  const skills = loadSkills();
  const server = buildMcpServer(skills);
  const transport = new SSEServerTransport("/messages", res);

  sessions.set(transport.sessionId, transport);
  res.on("close", () => sessions.delete(transport.sessionId));

  await server.connect(transport);
});

// Client sends JSON-RPC messages here
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = sessions.get(sessionId);
  if (!transport) return res.status(404).json({ error: "Session not found" });
  await transport.handlePostMessage(req, res, req.body);
});

// Health / info endpoint
app.get("/", (req, res) => {
  const skills = loadSkills();
  const staticTools = ["analyze_audio", "batch_analyze_audio", "find_similar_tracks"];
  res.json({
    name: "prompty",
    status: "ok",
    python: PYTHON_BIN,
    scriptsDir: LIBROSA_SCRIPTS_DIR,
    staticTools,
    skills: skills.length,
    tools: skills.map(s => slugify(s.name)),
    sse: `http://localhost:${PORT}/sse`,
  });
});

app.listen(PORT, () => {
  const skills = loadSkills();
  console.log(`\nPrompty MCP server`);
  console.log(`  SSE endpoint : http://localhost:${PORT}/sse`);
  console.log(`  Python       : ${PYTHON_BIN}`);
  console.log(`  Scripts dir  : ${LIBROSA_SCRIPTS_DIR}`);
  console.log(`  Static tools : analyze_audio, batch_analyze_audio, find_similar_tracks`);
  console.log(`  Tools loaded : ${skills.length} skill${skills.length !== 1 ? "s" : ""}`);
  console.log(`\nAdd this URL as a Custom Connector in Grok:\n  http://localhost:${PORT}/sse`);
  console.log(`\nFor public access, run: ngrok http ${PORT}\n`);
});
