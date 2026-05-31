import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph, KGNode } from "../../types/index.js";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try { return JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "knowledge-graph.json"), "utf-8")) as KnowledgeGraph; } catch { return null; }
}

function findLayerForNode(kg: KnowledgeGraph, nodeId: string): string | undefined {
  for (const layer of kg.layers) {
    if (layer.nodeIds.includes(nodeId)) return layer.name;
  }
  return undefined;
}

export const handler = async (args: Record<string, unknown>) => {
  const kg = loadKG();
  if (!kg) return { error: "No knowledge graph found" };
  const name = (args.name as string || "").toLowerCase();
  if (!name) return { error: "name is required" };

  const match = kg.nodes.find(n => n.name.toLowerCase().includes(name));
  if (!match) return { error: `No component found matching "${name}"` };

  const deps: KGNode[] = [];
  const dependents: KGNode[] = [];
  const nodeMap = new Map(kg.nodes.map(n => [n.id, n]));

  for (const e of kg.edges) {
    if (e.source === match.id) { const n = nodeMap.get(e.target); if (n) deps.push(n); }
    if (e.target === match.id) { const n = nodeMap.get(e.source); if (n) dependents.push(n); }
  }

  let code: string | undefined;
  if (match.filePath) { try { code = fs.readFileSync(match.filePath, "utf-8"); } catch {} }

  return {
    node: match,
    dependencies: deps,
    dependents,
    layer: findLayerForNode(kg, match.id),
    code: code?.substring(0, 2000),
  };
};
