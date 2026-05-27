import * as fs from "fs";
import * as path from "path";
import type { AnalysisResult } from "../types/index.js";

const MEMORY_DIR = ".smeargraph";
const MEMORY_FILE = "memory.json";

interface MemoryEntry {
  projectRoot: string;
  lastAnalyzed: string;
  fileSnapshots: Record<string, number>;
  result: AnalysisResult;
}

function memoryPath(projectRoot: string): string {
  const dir = path.join(projectRoot, MEMORY_DIR);
  return path.join(dir, MEMORY_FILE);
}

export function loadMemory(projectRoot: string): MemoryEntry | null {
  const mp = memoryPath(projectRoot);
  if (!fs.existsSync(mp)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(mp, "utf-8"));
    if (data.projectRoot !== projectRoot) return null;
    return data as MemoryEntry;
  } catch {
    return null;
  }
}

export function saveMemory(projectRoot: string, result: AnalysisResult, fileSnapshots: Record<string, number>): void {
  const dir = path.join(projectRoot, MEMORY_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const entry: MemoryEntry = {
    projectRoot,
    lastAnalyzed: new Date().toISOString(),
    fileSnapshots,
    result,
  };
  fs.writeFileSync(memoryPath(projectRoot), JSON.stringify(entry, null, 2), "utf-8");
}

export function detectChanges(projectRoot: string, memory: MemoryEntry): { changed: string[]; added: string[]; removed: string[] } {
  const changed: string[] = [];
  const added: string[] = [];
  const current = memory.fileSnapshots;
  const known = new Set(Object.keys(current));

  function scan(dir: string) {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) { if (!e.name.startsWith(".") && e.name !== "node_modules") scan(fp); }
      else {
        const mtime = fs.statSync(fp).mtimeMs;
        if (known.has(fp)) {
          known.delete(fp);
          if (current[fp] !== mtime) changed.push(fp);
        } else {
          added.push(fp);
        }
      }
    }
  }
  scan(projectRoot);
  const removed = [...known];
  return { changed, added, removed };
}

export function buildFileSnapshots(projectRoot: string, result: AnalysisResult): Record<string, number> {
  const snapshots: Record<string, number> = {};
  for (const s of result.symbols) {
    if (!snapshots[s.filePath]) {
      try { snapshots[s.filePath] = fs.statSync(s.filePath).mtimeMs; } catch { snapshots[s.filePath] = 0; }
    }
  }
  for (const d of result.rawDeps) {
    if (d.from && !snapshots[d.from]) {
      try { snapshots[d.from] = fs.statSync(d.from).mtimeMs; } catch { snapshots[d.from] = 0; }
    }
  }
  return snapshots;
}
