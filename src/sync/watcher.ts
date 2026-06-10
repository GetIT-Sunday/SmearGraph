import * as chokidar from "chokidar";
import * as fs from "fs";
import * as path from "path";
import { EventEmitter } from "events";

export interface FileChangeEvent {
  type: "add" | "change" | "unlink";
  path: string;
  timestamp: number;
}

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private pendingFiles = new Map<string, { firstSeen: number; lastSeen: number; type: "add" | "change" | "unlink" }>();
  private debounceMs: number;
  private projectRoot: string;

  constructor(projectRoot: string, debounceMs: number = 2000) {
    super();
    this.projectRoot = projectRoot;
    this.debounceMs = debounceMs;
  }

  start(): void {
    if (this.watcher) return;

    this.watcher = chokidar.watch(this.projectRoot, {
      ignored: [
        /(^|[\/\\])\../,
        /node_modules/,
        /\.smeargraph/,
        /dist/,
        /build/,
        /coverage/,
        /\.git/,
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: this.debounceMs,
        pollInterval: 100,
      },
    });

    this.watcher
      .on("change", (filePath) => this.handleChange("change", filePath))
      .on("add", (filePath) => this.handleChange("add", filePath))
      .on("unlink", (filePath) => this.handleChange("unlink", filePath));
  }

  private handleChange(type: "add" | "change" | "unlink", filePath: string): void {
    const relPath = path.relative(this.projectRoot, filePath);
    const now = Date.now();

    this.pendingFiles.set(relPath, {
      firstSeen: this.pendingFiles.get(relPath)?.firstSeen || now,
      lastSeen: now,
      type,
    });

    this.emit("change", { type, path: relPath, timestamp: now });
  }

  getPendingFiles(): Map<string, { firstSeen: number; lastSeen: number; type: "add" | "change" | "unlink" }> {
    return new Map(this.pendingFiles);
  }

  clearPending(): void {
    this.pendingFiles.clear();
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

export function getStalenessBanner(filePath: string, projectRoot: string): string | null {
  try {
    const fullPath = path.resolve(projectRoot, filePath);
    const stat = fs.statSync(fullPath);
    const age = Date.now() - stat.mtimeMs;
    if (age > 5000) {
      return `⚠️ File ${filePath} was edited ${(age / 1000).toFixed(1)}s ago — read directly for live content`;
    }
  } catch {}
  return null;
}
