import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph, KGNode, KGEdgeType } from "../../types/index.js";
import { bfsWithPriority } from "../../utils/graph-algorithms.js";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try { return JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "knowledge-graph.json"), "utf-8")) as KnowledgeGraph; } catch { return null; }
}

export const handler = async (args: Record<string, unknown>) => {
  const kg = loadKG();
  if (!kg) return { error: "No knowledge graph found. Run 'smeargraph init' first." };

  const startId = args.startId as string;
  if (!startId) return { error: "startId is required" };

  const direction = (args.direction as "incoming" | "outgoing" | "both") || "both";
  const maxDepth = (args.maxDepth as number) || 3;
  const edgeTypes = args.edgeTypes as KGEdgeType[] | undefined;
  const nodeTypes = args.nodeTypes as string[] | undefined;
  const limit = (args.limit as number) || 100;

  if (!kg.nodes.find(n => n.id === startId)) {
    return { error: `Node not found: ${startId}` };
  }

  const nodeFilter = nodeTypes
    ? (id: string) => {
        const n = kg.nodes.find(x => x.id === id);
        return n ? nodeTypes.includes(n.type) : false;
      }
    : undefined;

  const { visited, depthMap } = bfsWithPriority(kg.edges, new Set([startId]), {
    direction, maxDepth, edgeTypes, nodeFilter,
  });

  visited.add(startId);

  const nodeMap = new Map(kg.nodes.map(n => [n.id, n]));
  const results = [...visited]
    .map(id => nodeMap.get(id))
    .filter(Boolean)
    .map(n => ({
      id: n!.id,
      name: n!.name,
      type: n!.type,
      filePath: n!.filePath,
      depth: depthMap.get(n!.id) || 0,
    }))
    .sort((a, b) => a.depth - b.depth)
    .slice(0, limit);

  return {
    startId,
    direction,
    maxDepth,
    edgeTypes: edgeTypes || "all",
    visitedCount: visited.size,
    results,
  };
};
