import type { KnowledgeGraph, KGNode, KGNodeType } from "../../types/index.js";
import * as fs from "fs";
import * as path from "path";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try { return JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "knowledge-graph.json"), "utf-8")) as KnowledgeGraph; } catch { return null; }
}

export const handler = async (args: Record<string, unknown>) => {
  const kg = loadKG();
  if (!kg) return { error: "No knowledge graph found. Run 'smeargraph init' first." };
  const query = (args.query as string || "").toLowerCase().trim();
  const filterType = args.type as KGNodeType | undefined;
  if (!query) return { markdown: `No results found for "${query}"` };

  let results = kg.nodes.filter(n => {
    if (filterType && n.type !== filterType) return false;
    return n.name.toLowerCase().includes(query) ||
      (n.filePath?.toLowerCase().includes(query)) ||
      n.tags.some(t => t.toLowerCase().includes(query));
  });

  if (results.length === 0) {
    return { markdown: `Symbol "${query}" not found in the codebase` };
  }

  const limit = 50;
  const limited = results.slice(0, limit);
  const sections: string[] = [];

  sections.push(`## Search: "${query}"`);
  sections.push(`(${results.length} matches${results.length > limit ? `, showing first ${limit}` : ''})\n`);

  for (const node of limited) {
    const meta = node.metadata as Record<string, unknown> | undefined;
    const line = (meta?.startLine as number) || (meta?.line as number) || 0;
    const location = line > 0 ? `${node.filePath}:${line}` : node.filePath || "(unknown)";
    const tags = node.tags.length > 0 ? ` [${node.tags.join(", ")}]` : '';
    sections.push(`- **${node.name}** (${node.type})${tags} — ${location}`);
  }

  return { markdown: sections.join("\n") };
};
