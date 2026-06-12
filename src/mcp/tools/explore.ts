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

function addLineNumbers(source: string, startLine: number = 1): string {
  return source.split("\n").map((line, i) => {
    const num = String(startLine + i).padStart(4);
    return `${num}  ${line}`;
  }).join("\n");
}

function getStalenessBanner(filePath: string, projectRoot: string): string | null {
  try {
    const fullPath = path.resolve(projectRoot, filePath);
    const stat = fs.statSync(fullPath);
    const age = Date.now() - stat.mtimeMs;
    if (age > 5000) {
      return `⚠️ File ${filePath} was edited ${(age / 1000).toFixed(1)}s ago — read directly for live content`;
    }
  } catch {}
  return null;
}

function adaptiveBudget(nodeCount: number): number {
  if (nodeCount < 200) return 15000;
  if (nodeCount < 1000) return 25000;
  if (nodeCount < 5000) return 40000;
  return 60000;
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

  const budget = adaptiveBudget(kg.nodes.length);
  let totalChars = 0;
  let filesIncluded = 0;

  const sections: string[] = [];
  const staleFiles: string[] = [];

  sections.push(`## Explore: "${query}"`);
  sections.push(`(${matches.length} matches across ${grouped.size} files)\n`);

  for (const [filePath, fileNodes] of grouped) {
    if (filesIncluded >= maxFiles) break;

    const fullPath = path.resolve(projectRoot, filePath);
    let source = "";
    try { source = fs.readFileSync(fullPath, "utf-8"); } catch { continue; }

    const staleness = getStalenessBanner(filePath, projectRoot);
    if (staleness) staleFiles.push(staleness);

    const lines = source.split("\n");
    const symbolSections: string[] = [];

    for (const n of fileNodes) {
      const meta = n.metadata as Record<string, unknown> | undefined;
      const startLine = (meta?.startLine as number) || (meta?.line as number) || 0;
      const endLine = (meta?.endLine as number) || Math.min(startLine + 20, lines.length);

      if (startLine > 0 && startLine <= lines.length) {
        const codeBlock = lines.slice(startLine - 1, endLine).join("\n");
        const numbered = addLineNumbers(codeBlock, startLine);
        symbolSections.push(`### ${n.name} (${n.type})\n\`\`\`\n${numbered}\n\`\`\``);
      } else {
        symbolSections.push(`### ${n.name} (${n.type})\n*No source available*`);
      }
    }

    const fileSection = `#### ${filePath}\n${symbolSections.join("\n\n")}`;
    const sectionChars = fileSection.length;

    if (totalChars + sectionChars > budget && filesIncluded > 0) {
      sections.push(`\n*${grouped.size - filesIncluded} more files not shown*`);
      break;
    }

    sections.push(fileSection);
    totalChars += sectionChars;
    filesIncluded++;
  }

  if (staleFiles.length > 0) {
    sections.push("\n---");
    sections.push(staleFiles.join("\n"));
  }

  return { markdown: sections.join("\n\n") };
};
