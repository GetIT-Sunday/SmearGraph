import * as fs from "fs";
import * as path from "path";
import type { KnowledgeGraph, KGNode } from "../../types/index.js";

function loadKG(): KnowledgeGraph | null {
  const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
  try { return JSON.parse(fs.readFileSync(path.join(root, ".smeargraph", "knowledge-graph.json"), "utf-8")) as KnowledgeGraph; } catch { return null; }
}

function tokenize(query: string): string[] {
  const tokens: string[] = [];
  const parts = query.split(/[\s,;]+/).filter(Boolean);
  for (const part of parts) {
    const camel = part.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
    const snake = part.replace(/-/g, "_").toLowerCase();
    tokens.push(camel, snake, part.toLowerCase());
  }
  return [...new Set(tokens)];
}

function searchNodesByTokens(kg: KnowledgeGraph, tokens: string[], limit: number): KGNode[] {
  const scored: Array<{ node: KGNode; score: number }> = [];

  for (const n of kg.nodes) {
    const nameLower = n.name.toLowerCase();
    const pathLower = (n.filePath || "").toLowerCase();
    let score = 0;

    for (const token of tokens) {
      if (nameLower === token) score += 10;
      else if (nameLower.startsWith(token)) score += 8;
      else if (nameLower.includes(token)) score += 5;
      else if (pathLower.includes(token)) score += 3;
      else if (n.tags.some(t => t.toLowerCase().includes(token))) score += 2;
    }

    if (score > 0) scored.push({ node: n, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.node);
}

function groupByFile(nodes: KGNode[]): Map<string, KGNode[]> {
  const grouped = new Map<string, KGNode[]>();
  for (const n of nodes) {
    const fp = n.filePath || "(unknown)";
    if (!grouped.has(fp)) grouped.set(fp, []);
    grouped.get(fp)!.push(n);
  }
  return grouped;
}

export const handler = async (args: Record<string, unknown>) => {
  const kg = loadKG();
  if (!kg) return { error: "No knowledge graph found. Run 'smeargraph init' first." };

  const query = (args.query as string || "").trim();
  if (!query) return { error: "query is required" };

  const maxFiles = (args.maxFiles as number) || 12;
  const projectRoot = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();

  const tokens = tokenize(query);
  const matches = searchNodesByTokens(kg, tokens, maxFiles * 3);
  const grouped = groupByFile(matches);

  const output: Array<{ file: string; symbols: Array<{ name: string; type: string; line?: number }> }> = [];
  let filesIncluded = 0;

  for (const [filePath, fileNodes] of grouped) {
    if (filesIncluded >= maxFiles) break;

    const fullPath = path.resolve(projectRoot, filePath);
    let source = "";
    try { source = fs.readFileSync(fullPath, "utf-8"); } catch { continue; }

    const lines = source.split("\n");
    const symbols = fileNodes.map(n => {
      const meta = n.metadata as Record<string, unknown> | undefined;
      const startLine = (meta?.startLine as number) || 0;
      return {
        name: n.name,
        type: n.type,
        line: startLine,
        signature: (meta?.signature as string) || "",
        body: startLine > 0 ? lines.slice(startLine - 1, startLine + 20).join("\n") : "",
      };
    });

    output.push({ file: filePath, symbols });
    filesIncluded++;
  }

  const budget = kg.nodes.length < 200 ? 30000 : kg.nodes.length < 2000 ? 50000 : 80000;
  let totalChars = 0;
  const truncated = output.filter(item => {
    const itemChars = JSON.stringify(item).length;
    if (totalChars + itemChars > budget) return false;
    totalChars += itemChars;
    return true;
  });

  return {
    query,
    tokens,
    filesShown: truncated.length,
    totalMatches: matches.length,
    results: truncated,
  };
};
