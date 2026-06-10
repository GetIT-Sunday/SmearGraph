import * as fs from "fs";
import * as path from "path";

export interface MemoryEntry {
  id: string;
  kind: "decision" | "insight" | "pattern" | "issue";
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export class MemoryStore {
  private filePath: string;
  private memories: MemoryEntry[] = [];

  constructor(projectRoot: string) {
    this.filePath = path.join(projectRoot, ".smeargraph", "memory-store.json");
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        this.memories = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      }
    } catch {
      this.memories = [];
    }
  }

  private save(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.memories, null, 2), "utf-8");
  }

  store(kind: MemoryEntry["kind"], title: string, content: string, tags: string[] = []): MemoryEntry {
    const now = new Date().toISOString();
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      title,
      content,
      tags,
      createdAt: now,
      updatedAt: now,
    };
    this.memories.push(entry);
    this.save();
    return entry;
  }

  get(id: string): MemoryEntry | undefined {
    return this.memories.find(m => m.id === id);
  }

  search(query: string, limit: number = 20): MemoryEntry[] {
    const queryLower = query.toLowerCase();
    const scored: Array<{ entry: MemoryEntry; score: number }> = [];

    for (const entry of this.memories) {
      let score = 0;
      if (entry.title.toLowerCase().includes(queryLower)) score += 10;
      if (entry.content.toLowerCase().includes(queryLower)) score += 5;
      if (entry.tags.some(t => t.toLowerCase().includes(queryLower))) score += 3;

      if (score > 0) scored.push({ entry, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.entry);
  }

  list(kind?: MemoryEntry["kind"], limit: number = 50): MemoryEntry[] {
    let filtered = kind ? this.memories.filter(m => m.kind === kind) : this.memories;
    return filtered.slice(-limit).reverse();
  }

  delete(id: string): boolean {
    const index = this.memories.findIndex(m => m.id === id);
    if (index === -1) return false;
    this.memories.splice(index, 1);
    this.save();
    return true;
  }

  stats(): { total: number; byKind: Record<string, number> } {
    const byKind: Record<string, number> = {};
    for (const entry of this.memories) {
      byKind[entry.kind] = (byKind[entry.kind] || 0) + 1;
    }
    return { total: this.memories.length, byKind };
  }
}

export function getMemoryStore(projectRoot: string): MemoryStore {
  return new MemoryStore(projectRoot);
}
