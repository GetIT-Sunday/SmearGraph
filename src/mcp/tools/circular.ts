import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph } from "../../types/index.js";
import { tarjanSCC } from "../../utils/graph-algorithms.js";
import { formatCircularResult } from "../../utils/formatter.js";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try { return JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "knowledge-graph.json"), "utf-8")) as KnowledgeGraph; } catch { return null; }
}

export const handler = async (_args: Record<string, unknown>) => {
  const kg = loadKG();
  if (!kg) return { error: "No knowledge graph found. Run 'smeargraph init' first." };

  const structuralEdges = kg.edges.filter(e =>
    e.type === "imports" || e.type === "depends_on" ||
    e.type === "calls" || e.type === "extends" || e.type === "implements"
  );

  const sccs = tarjanSCC(kg.nodes, structuralEdges);
  const nodeMap = new Map(kg.nodes.map(n => [n.id, n]));

  const cycles = sccs
    .map(scc => {
      const members = scc.cycle.map(id => nodeMap.get(id)).filter(Boolean);
      return {
        size: scc.size,
        edgeTypes: scc.edgeTypes,
        members: members.map(n => ({
          id: n!.id, name: n!.name, type: n!.type, filePath: n!.filePath,
        })),
        preview: scc.cycle.slice(0, 3).map(id => nodeMap.get(id)?.name).join(" → "),
      };
    })
    .sort((a, b) => b.size - a.size);

  const result = {
    cycleCount: cycles.length,
    cycles: cycles.slice(0, 20).map(c => ({
      size: c.size,
      edgeTypes: c.edgeTypes,
      members: c.members.map(m => ({ name: m.name, type: m.type })),
    })),
    totalAffectedNodes: cycles.reduce((sum, c) => sum + c.size, 0),
  };

  return { markdown: formatCircularResult(result), ...result };
};
