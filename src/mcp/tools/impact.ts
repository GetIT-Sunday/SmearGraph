import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph, KGNode } from "../../types/index.js";
import { formatImpactResult } from "../../utils/formatter.js";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try { return JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "knowledge-graph.json"), "utf-8")) as KnowledgeGraph; } catch { return null; }
}

export const handler = async (args: Record<string, unknown>) => {
  const kg = loadKG();
  if (!kg) return { error: "No knowledge graph found. Run 'smeargraph init' first." };
  const query = (args.path as string || "").toLowerCase();
  const depth = (args.depth as number) || 2;
  if (!query) return { error: "path is required" };

  const matched = kg.nodes.filter(n => n.filePath?.toLowerCase().includes(query));
  if (matched.length === 0) return { affected: [], affectedLayers: [], risk: "low", nodeCount: 0 };

  const nodeMap = new Map(kg.nodes.map(n => [n.id, n]));
  const affected = new Set<string>();
  const layers = new Set<string>();
  let current = new Set(matched.map(m => m.id));

  for (let d = 0; d < depth; d++) {
    const next = new Set<string>();
    for (const e of kg.edges) {
      if (current.has(e.source) && !affected.has(e.target)) { affected.add(e.target); next.add(e.target); }
      if (current.has(e.target) && !affected.has(e.source)) { affected.add(e.source); next.add(e.source); }
    }
    current = next;
  }

  for (const nid of affected) {
    for (const layer of kg.layers) {
      if (layer.nodeIds.includes(nid)) layers.add(layer.name);
    }
  }
  const affectedNodes = [...affected].map(id => nodeMap.get(id)).filter(Boolean) as KGNode[];
  const count = affectedNodes.length;
  const risk = count > 20 ? "high" : count > 5 ? "medium" : "low";

  const result = {
    affected: affectedNodes.map(n => ({ name: n.name, type: n.type, filePath: n.filePath })),
    affectedLayers: [...layers],
    risk,
    nodeCount: count,
  };

  return { markdown: formatImpactResult(result), ...result };
};
