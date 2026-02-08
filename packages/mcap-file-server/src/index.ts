import cors from "cors";
import express from "express";
import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(__dirname, "..", "..", "..", "mcap-data");
const rootDir = path.resolve(process.env.MCAP_ROOT ?? defaultRoot);
const port = Number(process.env.PORT ?? 3100);

function toPosixPath(inputPath: string) {
  return inputPath.split(path.sep).join("/");
}

function resolveWithinRoot(relPath: string) {
  const cleaned = relPath.replace(/^\/+/, "");
  const resolved = path.resolve(rootDir, cleaned);
  const relative = path.relative(rootDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path escape detected");
  }
  return resolved;
}

type TreeNode = {
  name: string;
  path: string;
  type: "folder" | "file";
  children?: TreeNode[];
};

async function buildTree(dir: string, relBase: string): Promise<TreeNode[]> {
  let entries: fs.Dirent[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const folders: TreeNode[] = [];
  const files: TreeNode[] = [];
  const fileNames = new Set(
    entries.filter((entry) => entry.isFile()).map((entry) => entry.name.toLowerCase()),
  );

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const entryRel = relBase ? path.posix.join(relBase, entry.name) : entry.name;
    const entryAbs = path.resolve(dir, entry.name);

    if (entry.isDirectory()) {
      const children = await buildTree(entryAbs, entryRel);
      if (children.length > 0) {
        folders.push({
          name: entry.name,
          path: entryRel,
          type: "folder",
          children,
        });
      }
      continue;
    }

    if (entry.isFile()) {
      const lowerName = entry.name.toLowerCase();
      if (lowerName.endsWith(".mcap")) {
        files.push({
          name: entry.name,
          path: entryRel,
          type: "file",
        });
        continue;
      }

      const mcapMarker = ".mcap.";
      const markerIndex = lowerName.indexOf(mcapMarker);
      if (markerIndex !== -1) {
        const baseLower = lowerName.slice(0, markerIndex + ".mcap".length);
        if (fileNames.has(baseLower)) {
          files.push({
            name: entry.name,
            path: entryRel,
            type: "file",
          });
        }
      }
    }
  }

  folders.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  return [...folders, ...files];
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/config", (_req, res) => {
  res.json({
    rootDir,
  });
});

app.get("/api/tree", async (_req, res) => {
  const children = await buildTree(rootDir, "");
  const tree: TreeNode = {
    name: path.basename(rootDir),
    path: "",
    type: "folder",
    children,
  };
  res.json(tree);
});

async function sendMcapFile(req: express.Request, res: express.Response, relPath: string) {
  if (!relPath) {
    res.status(400).json({ error: "path is required" });
    return;
  }

  let filePath = "";
  try {
    filePath = resolveWithinRoot(relPath);
  } catch {
    res.status(400).json({ error: "invalid path" });
    return;
  }

  let stat: fs.Stats;
  try {
    stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      res.status(404).json({ error: "not a file" });
      return;
    }
  } catch {
    res.status(404).json({ error: "not found" });
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Accept-Ranges, Content-Length, Content-Range, ETag, Last-Modified",
  );
  res.setHeader("Accept-Ranges", "bytes");
  res.type("application/octet-stream");

  const size = stat.size;
  const rangeHeader = req.headers.range;
  if (rangeHeader) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
    if (!match) {
      res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
      return;
    }
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
      res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
      return;
    }
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    res.setHeader("Content-Length", String(end - start + 1));
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.setHeader("Content-Length", String(size));
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

app.get("/api/file/*", async (req, res) => {
  const relPath = typeof req.params[0] === "string" ? req.params[0] : "";
  await sendMcapFile(req, res, relPath);
});

app.get("/api/file", async (req, res) => {
  const relPath = typeof req.query.path === "string" ? req.query.path : "";
  await sendMcapFile(req, res, relPath);
});

app.listen(port, () => {
  const relRoot = toPosixPath(path.relative(process.cwd(), rootDir));
  console.log(`[mcap-file-server] listening on http://localhost:${port}`);
  console.log(`[mcap-file-server] MCAP root: ${relRoot || "."}`);
});
