import type { KnowledgeGraph } from "../types/index.js";

export function validateKnowledgeGraph(kg: KnowledgeGraph): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(kg.nodes.map(n => n.id));
  for (const edge of kg.edges) {
    if (!nodeIds.has(edge.source)) errors.push(`Edge source "${edge.source}" not found in nodes`);
    if (!nodeIds.has(edge.target)) errors.push(`Edge target "${edge.target}" not found in nodes`);
  }
  for (const layer of kg.layers) {
    for (const nid of layer.nodeIds) {
      if (!nodeIds.has(nid)) errors.push(`Layer "${layer.name}" references missing node "${nid}"`);
    }
  }
  if (kg.tour) {
    for (const step of kg.tour) {
      for (const nid of step.nodeIds) {
        if (!nodeIds.has(nid)) errors.push(`Tour step "${step.title}" references missing node "${nid}"`);
      }
    }
  }
  return errors;
}
