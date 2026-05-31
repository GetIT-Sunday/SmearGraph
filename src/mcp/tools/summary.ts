import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph } from "../../types/index.js";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try { return JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "knowledge-graph.json"), "utf-8")) as KnowledgeGraph; } catch { return null; }
}

export const handler = async (args: Record<string, unknown>) => {
  const kg = loadKG();
  if (!kg) return { error: "No knowledge graph found" };
  const nodeId = args.nodeId as string;
  if (!nodeId) return { error: "nodeId is required" };

  const node = kg.nodes.find(n => n.id === nodeId);
  if (!node) return { error: `Node "${nodeId}" not found` };

  // Check for LLM-enriched summaries
  let llmSummary: string | undefined;
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try {
    const cache = JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "llm-cache.json"), "utf-8"));
    if (cache.summaries?.[nodeId]) llmSummary = cache.summaries[nodeId];
  } catch {}

  return {
    node: {
      id: node.id, name: node.name, type: node.type, filePath: node.filePath,
      tags: node.tags, complexity: node.complexity,
      summary: node.summary || llmSummary || null,
    },
  };
};
