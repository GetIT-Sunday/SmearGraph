import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph } from "../../types/index.js";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try { return JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "knowledge-graph.json"), "utf-8")) as KnowledgeGraph; } catch { return null; }
}

export const handler = async (args: Record<string, unknown>) => {
  const kg = loadKG();
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();

  // Try loading trace results
  let traceData: unknown = undefined;
  try {
    traceData = JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "trace-results.json"), "utf-8"));
  } catch {}

  if (!kg && !traceData) return { error: "No knowledge graph or trace data found" };

  const func = args.func as string | undefined;
  if (func && kg) {
    const funcNode = kg.nodes.find(n =>
      (n.type === "function" || n.type === "class") &&
      n.name.toLowerCase().includes(func.toLowerCase())
    );
    if (!funcNode) return { error: `No function found matching "${func}"` };

    const callChain: { from: string; to: string }[] = [];
    for (const e of kg.edges) {
      if (e.source === funcNode.id && e.type === "calls") {
        callChain.push({ from: funcNode.name, to: kg.nodes.find(n => n.id === e.target)?.name || e.target });
      }
    }
    return { callChain, traceData };
  }

  return { callChain: [], traceData };
};
