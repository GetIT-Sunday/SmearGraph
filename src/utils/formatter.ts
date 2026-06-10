import * as fs from "fs";
import * as path from "path";

const MAX_OUTPUT_LENGTH = 24000;

export function formatMarkdown(title: string, sections: Array<{ heading: string; content: string }>): string {
  let output = `## ${title}\n\n`;
  for (const section of sections) {
    output += `### ${section.heading}\n${section.content}\n\n`;
  }
  return output.length > MAX_OUTPUT_LENGTH
    ? output.slice(0, MAX_OUTPUT_LENGTH) + "\n\n... (output truncated)"
    : output;
}

export function formatCodeWithLines(filePath: string, startLine: number, endLine: number, projectRoot: string): string {
  const fullPath = path.resolve(projectRoot, filePath);
  let source: string;
  try { source = fs.readFileSync(fullPath, "utf-8"); } catch { return `(unable to read ${filePath})`; }

  const lines = source.split("\n");
  const start = Math.max(0, startLine - 1);
  const end = Math.min(lines.length, endLine);
  const numbered = lines.slice(start, end).map((line, i) => {
    const lineNum = String(start + i + 1).padStart(4);
    return `${lineNum}│ ${line}`;
  });
  return "```\n" + numbered.join("\n") + "\n```";
}

export function formatStaleness(filePath: string, projectRoot: string): string | null {
  const fullPath = path.resolve(projectRoot, filePath);
  try {
    const stat = fs.statSync(fullPath);
    const age = Date.now() - stat.mtimeMs;
    if (age > 5000) {
      return `⚠️ File ${filePath} was edited ${(age / 1000).toFixed(1)}s ago — read directly for live content`;
    }
  } catch {}
  return null;
}

export function formatImpactResult(result: {
  affected: Array<{ name: string; type: string; filePath?: string }>;
  affectedLayers: string[];
  risk: string;
  nodeCount: number;
}): string {
  const sections: Array<{ heading: string; content: string }> = [];

  sections.push({
    heading: "Risk Assessment",
    content: `- **${result.risk}** — ${result.nodeCount} affected nodes across ${result.affectedLayers.length} layers\n- Layers: ${result.affectedLayers.join(", ") || "none"}`,
  });

  if (result.affected.length > 0) {
    const grouped = new Map<string, typeof result.affected>();
    for (const n of result.affected) {
      const fp = n.filePath || "(unknown)";
      if (!grouped.has(fp)) grouped.set(fp, []);
      grouped.get(fp)!.push(n);
    }

    let content = "";
    for (const [file, nodes] of grouped) {
      content += `\n#### ${file}\n`;
      for (const n of nodes) {
        content += `- ${n.name} (${n.type})\n`;
      }
    }
    sections.push({ heading: "Affected Nodes", content });
  }

  return formatMarkdown("Impact Analysis", sections);
}

export function formatCircularResult(result: {
  cycleCount: number;
  cycles: Array<{ size: number; edgeTypes: string[]; members: Array<{ name: string; type: string }> }>;
}): string {
  const sections: Array<{ heading: string; content: string }> = [];

  sections.push({
    heading: "Summary",
    content: `- Found **${result.cycleCount}** circular dependency cycles`,
  });

  if (result.cycles.length > 0) {
    let content = "";
    for (const cycle of result.cycles) {
      content += `\n#### Cycle (${cycle.size} nodes, edges: ${cycle.edgeTypes.join(", ")})\n`;
      for (const m of cycle.members) {
        content += `- ${m.name} (${m.type})\n`;
      }
    }
    sections.push({ heading: "Cycles", content });
  }

  return formatMarkdown("Circular Dependencies", sections);
}

export function formatDeadResult(result: {
  deadCount: number;
  deadByFile: Array<{ file: string; symbols: Array<{ name: string; type: string }> }>;
}): string {
  const sections: Array<{ heading: string; content: string }> = [];

  sections.push({
    heading: "Summary",
    content: `- Found **${result.deadCount}** potentially dead symbols`,
  });

  if (result.deadByFile.length > 0) {
    let content = "";
    for (const file of result.deadByFile) {
      content += `\n#### ${file.file}\n`;
      for (const s of file.symbols) {
        content += `- ${s.name} (${s.type})\n`;
      }
    }
    sections.push({ heading: "Dead Code by File", content });
  }

  return formatMarkdown("Dead Code Analysis", sections);
}
