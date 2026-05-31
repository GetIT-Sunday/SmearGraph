import type { KnowledgeGraph, KGNode, KGNodeType } from "../../types/index.js";
import * as fs from "fs";
import * as path from "path";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try { return JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "knowledge-graph.json"), "utf-8")) as KnowledgeGraph; } catch { return null; }
}

export const handler = async (args: Record<string, unknown>) => {
  const kg = loadKG();
  if (!kg) return { error: "No knowledge graph found" };
  const query = (args.query as string || "").toLowerCase();
  const filterType = args.type as KGNodeType | undefined;
  if (!query) return { matches: [], count: 0 };

  let results = kg.nodes.filter(n => {
    if (filterType && n.type !== filterType) return false;
    return n.name.toLowerCase().includes(query) ||
      (n.filePath?.toLowerCase().includes(query)) ||
      n.tags.some(t => t.toLowerCase().includes(query));
  });

  return { matches: results.slice(0, 50), count: results.length };
};
