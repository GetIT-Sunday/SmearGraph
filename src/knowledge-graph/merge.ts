import type { KnowledgeGraph, KGNode, KGEdge, KGLayer } from "../types/index.js";

export function mergeKnowledgeGraphs(graphs: KnowledgeGraph[], projectName?: string): KnowledgeGraph {
  const nodeMap = new Map<string, KGNode>();
  const edgeSet = new Set<string>();
  const edges: KGEdge[] = [];
  const layerMap = new Map<string, KGLayer>();
  const allLangs = new Set<string>();
  let latestAnalysis = "";

  for (const g of graphs) {
    for (const n of g.nodes) {
      if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
    }
    for (const e of g.edges) {
      const key = `${e.source}|${e.target}|${e.type}`;
      if (!edgeSet.has(key)) { edgeSet.add(key); edges.push(e); }
    }
    for (const l of g.layers) {
      if (!layerMap.has(l.id)) {
        layerMap.set(l.id, { ...l, nodeIds: [...l.nodeIds] });
      } else {
        const existing = layerMap.get(l.id)!;
        for (const nid of l.nodeIds) { if (!existing.nodeIds.includes(nid)) existing.nodeIds.push(nid); }
      }
    }
    for (const lang of g.project.languages) allLangs.add(lang);
    if (g.project.analyzedAt > latestAnalysis) latestAnalysis = g.project.analyzedAt;
  }

  return {
    project: {
      name: projectName || graphs[0]?.project.name || "merged",
      languages: [...allLangs],
      frameworks: [],
      analyzedAt: latestAnalysis || new Date().toISOString(),
    },
    nodes: [...nodeMap.values()],
    edges,
    layers: [...layerMap.values()],
    tour: graphs.flatMap(g => g.tour || []).map((s, i) => ({ ...s, order: i + 1 })),
  };
}
