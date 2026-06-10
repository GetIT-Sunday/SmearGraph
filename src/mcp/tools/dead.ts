import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph, KGNode } from "../../types/index.js";
import { formatDeadResult } from "../../utils/formatter.js";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try { return JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "knowledge-graph.json"), "utf-8")) as KnowledgeGraph; } catch { return null; }
}

export const handler = async (args: Record<string, unknown>) => {
  const kg = loadKG();
  if (!kg) return { error: "No knowledge graph found. Run 'smeargraph init' first." };

  const includeUnexported = args.includeUnexported === true;
  const limit = (args.limit as number) || 50;

  const referenced = new Set<string>();
  for (const e of kg.edges) {
    if (e.type === "contains") continue;
    referenced.add(e.target);
  }
  // If a file is imported, all its symbols are considered referenced
  const referencedFiles = new Set<string>();
  for (const e of kg.edges) {
    if (e.type === "imports") {
      referencedFiles.add(e.target);
    }
  }
  for (const n of kg.nodes) {
    if (n.type === "function" || n.type === "class") {
      const fileNode = `file:${n.filePath?.replace(process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd(), "").replace(/^\//, "")}`;
      if (referencedFiles.has(fileNode)) {
        referenced.add(n.id);
      }
    }
  }

  const isExported = (n: KGNode) => {
    const meta = n.metadata as Record<string, unknown> | undefined;
    return meta?.isExported === true || meta?.exported === true || n.tags.includes("exported");
  };

  const dead: KGNode[] = [];
  const candidates = includeUnexported
    ? kg.nodes.filter(n => n.type !== "module" && n.type !== "component")
    : kg.nodes.filter(n => n.type !== "module" && n.type !== "component" && isExported(n));

  for (const n of candidates) {
    if (!referenced.has(n.id)) {
      dead.push(n);
    }
  }

  const byFile = new Map<string, KGNode[]>();
  for (const n of dead) {
    const fp = n.filePath || "(unknown)";
    if (!byFile.has(fp)) byFile.set(fp, []);
    byFile.get(fp)!.push(n);
  }

  const result = {
    deadCount: dead.length,
    deadByFile: [...byFile.entries()].map(([file, nodes]) => ({
      file,
      symbols: nodes.map(n => ({ name: n.name, type: n.type })),
    })).slice(0, limit),
  };

  return { markdown: formatDeadResult(result), ...result, note: "Only exported symbols reported by default. Set includeUnexported=true to see all unreferenced symbols." };
};
