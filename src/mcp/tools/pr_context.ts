import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import type { KnowledgeGraph, KGNode } from "../../types/index.js";
import { formatImpactResult } from "../../utils/formatter.js";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try { return JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "knowledge-graph.json"), "utf-8")) as KnowledgeGraph; } catch { return null; }
}

export const handler = async (args: Record<string, unknown>) => {
  const kg = loadKG();
  if (!kg) return { error: "No knowledge graph found. Run 'smeargraph init' first." };

  const projectRoot = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  const depth = (args.depth as number) || 2;

  let diff: string;
  try {
    diff = execSync("git diff --name-only", { cwd: projectRoot, encoding: "utf-8" });
  } catch {
    return { error: "Not a git repository or git not available" };
  }

  const changedFiles = diff.split("\n").filter(f => f.trim());
  if (changedFiles.length === 0) {
    return { message: "No changes detected", changedFiles: [], affected: [] };
  }

  const affected = new Set<string>();
  const nodeMap = new Map(kg.nodes.map(n => [n.id, n]));

  for (const file of changedFiles) {
    const fileId = `file:${file}`;
    const matched = kg.nodes.filter(n => n.filePath?.includes(file) || n.id === fileId);

    for (const node of matched) {
      affected.add(node.id);

      let current = new Set([node.id]);
      for (let d = 0; d < depth; d++) {
        const next = new Set<string>();
        for (const e of kg.edges) {
          if (current.has(e.source) && !affected.has(e.target)) {
            affected.add(e.target);
            next.add(e.target);
          }
          if (current.has(e.target) && !affected.has(e.source)) {
            affected.add(e.source);
            next.add(e.source);
          }
        }
        current = next;
      }
    }
  }

  const layers = new Set<string>();
  for (const nid of affected) {
    for (const layer of kg.layers) {
      if (layer.nodeIds.includes(nid)) layers.add(layer.name);
    }
  }

  const affectedNodes = [...affected].map(id => nodeMap.get(id)).filter(Boolean) as KGNode[];
  const count = affectedNodes.length;
  const risk = count > 20 ? "high" : count > 5 ? "medium" : "low";

  const result = {
    changedFiles,
    affected: affectedNodes.map(n => ({ name: n.name, type: n.type, filePath: n.filePath })),
    affectedLayers: [...layers],
    risk,
    nodeCount: count,
  };

  return {
    markdown: formatImpactResult(result),
    ...result,
  };
};
