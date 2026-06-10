import type { KnowledgeGraph, KGNode, KGEdge } from "../types/index.js";

export interface PrecomputedGraph {
  adjacencyLists: {
    outgoing: Map<string, KGEdge[]>;
    incoming: Map<string, KGEdge[]>;
  };
  nodeMap: Map<string, KGNode>;
  layerMap: Map<string, string[]>;
  nodeToLayer: Map<string, string>;
}

export function precomputeGraph(kg: KnowledgeGraph): PrecomputedGraph {
  const outgoing = new Map<string, KGEdge[]>();
  const incoming = new Map<string, KGEdge[]>();
  const nodeMap = new Map<string, KGNode>();
  const layerMap = new Map<string, string[]>();
  const nodeToLayer = new Map<string, string>();

  for (const node of kg.nodes) {
    nodeMap.set(node.id, node);
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of kg.edges) {
    const outList = outgoing.get(edge.source);
    if (outList) outList.push(edge);

    const inList = incoming.get(edge.target);
    if (inList) inList.push(edge);
  }

  for (const layer of kg.layers) {
    layerMap.set(layer.id, layer.nodeIds);
    for (const nodeId of layer.nodeIds) {
      nodeToLayer.set(nodeId, layer.id);
    }
  }

  return {
    adjacencyLists: { outgoing, incoming },
    nodeMap,
    layerMap,
    nodeToLayer,
  };
}

export function getNeighbors(
  precomputed: PrecomputedGraph,
  nodeId: string,
  direction: "outgoing" | "incoming" | "both",
  edgeTypes?: string[]
): KGEdge[] {
  const result: KGEdge[] = [];

  if (direction === "outgoing" || direction === "both") {
    const outEdges = precomputed.adjacencyLists.outgoing.get(nodeId) || [];
    for (const edge of outEdges) {
      if (!edgeTypes || edgeTypes.includes(edge.type)) {
        result.push(edge);
      }
    }
  }

  if (direction === "incoming" || direction === "both") {
    const inEdges = precomputed.adjacencyLists.incoming.get(nodeId) || [];
    for (const edge of inEdges) {
      if (!edgeTypes || edgeTypes.includes(edge.type)) {
        result.push(edge);
      }
    }
  }

  return result;
}

export function getNodeLayer(precomputed: PrecomputedGraph, nodeId: string): string | undefined {
  return precomputed.nodeToLayer.get(nodeId);
}

export function getLayerNodes(precomputed: PrecomputedGraph, layerId: string): string[] {
  return precomputed.layerMap.get(layerId) || [];
}
