import type { KnowledgeGraph, KGEdge } from "../types/index.js";

const EDGE_PRIORITY: Record<string, number> = {
  contains: 10,
  extends: 8,
  implements: 8,
  calls: 6,
  calls_async: 6,
  imports: 4,
  depends_on: 3,
  references: 1,
};

export function tarjanSCC(
  nodes: Array<{ id: string }>,
  edges: KGEdge[]
): Array<{ cycle: string[]; size: number; edgeTypes: string[] }> {
  const adj = new Map<string, Array<{ target: string; type: string }>>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const list = adj.get(e.source);
    if (list) list.push({ target: e.target, type: e.type });
  }

  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongconnect(v: string) {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const { target } of adj.get(v) || []) {
      if (!indices.has(target)) {
        strongconnect(target);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(target)!));
      } else if (onStack.has(target)) {
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(target)!));
      }
    }

    if (lowlinks.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do { w = stack.pop()!; onStack.delete(w); scc.push(w); } while (w !== v);
      if (scc.length >= 2) sccs.push(scc);
    }
  }

  for (const n of nodes) {
    if (!indices.has(n.id)) strongconnect(n.id);
  }

  return sccs.map(cycle => {
    const cycleSet = new Set(cycle);
    const edgeTypes = new Set<string>();
    for (const e of edges) {
      if (cycleSet.has(e.source) && cycleSet.has(e.target)) edgeTypes.add(e.type);
    }
    return { cycle, size: cycle.length, edgeTypes: [...edgeTypes] };
  });
}

export function bfsWithPriority(
  edges: KGEdge[],
  startIds: Set<string>,
  options: {
    direction: "incoming" | "outgoing" | "both";
    maxDepth: number;
    edgeTypes?: string[];
    nodeFilter?: (id: string) => boolean;
  }
): { visited: Set<string>; depthMap: Map<string, number> } {
  const visited = new Set<string>();
  const depthMap = new Map<string, number>();
  let current = new Set(startIds);
  for (const id of startIds) { visited.add(id); depthMap.set(id, 0); }

  for (let d = 0; d < options.maxDepth && current.size > 0; d++) {
    const sorted = [...edges].sort((a, b) =>
      (EDGE_PRIORITY[b.type] || 0) - (EDGE_PRIORITY[a.type] || 0)
    );
    const next = new Set<string>();

    for (const e of sorted) {
      if (options.edgeTypes && !options.edgeTypes.includes(e.type)) continue;

      const candidates: Array<[string, string]> = [];
      if (options.direction === "outgoing" || options.direction === "both") {
        if (current.has(e.source) && !visited.has(e.target)) candidates.push([e.source, e.target]);
      }
      if (options.direction === "incoming" || options.direction === "both") {
        if (current.has(e.target) && !visited.has(e.source)) candidates.push([e.target, e.source]);
      }

      for (const [, target] of candidates) {
        if (options.nodeFilter && !options.nodeFilter(target)) continue;
        if (!visited.has(target)) {
          visited.add(target);
          depthMap.set(target, d + 1);
          next.add(target);
        }
      }
    }
    current = next;
  }
  return { visited, depthMap };
}
