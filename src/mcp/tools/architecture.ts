import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph } from "../../types/index.js";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  const p = path.join(root, ".smeargraph", "knowledge-graph.json");
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) as KnowledgeGraph; } catch { return null; }
}

function bfsEdges(kg: KnowledgeGraph, startIds: Set<string>, maxDepth: number): Set<string> {
  const included = new Set<string>();
  let current = new Set(startIds);
  for (let d = 0; d < maxDepth && current.size > 0; d++) {
    const next = new Set<string>();
    for (const edge of kg.edges) {
      if (current.has(edge.source) && !included.has(`${edge.source}|${edge.target}|${edge.type}`)) {
        included.add(`${edge.source}|${edge.target}|${edge.type}`);
        next.add(edge.target);
      }
      if (current.has(edge.target) && !included.has(`${edge.source}|${edge.target}|${edge.type}`)) {
        included.add(`${edge.source}|${edge.target}|${edge.type}`);
        next.add(edge.source);
      }
    }
    current = next;
  }
  return included;
}

export const handler = async (args: Record<string, unknown>) => {
  const kg = loadKG();
  if (!kg) return { error: "No knowledge graph found. Run 'smeargraph analyze' first." };

  const depth = (args.depth as number) || 3;
  const componentIds = new Set(kg.nodes.filter(n => n.type === "component").map(n => n.id));
  const edgeKeys = bfsEdges(kg, componentIds, depth);

  return {
    project: kg.project,
    layers: kg.layers,
    components: kg.nodes.filter(n => n.type === "component").map(n => ({
      name: n.name, type: n.type, summary: n.summary, filePath: n.filePath,
    })),
    edges: kg.edges.filter(e => edgeKeys.has(`${e.source}|${e.target}|${e.type}`)),
  };
};
