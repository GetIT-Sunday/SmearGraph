import type { AnalysisResult } from "../types/index.js";

export function renderMermaid(result: AnalysisResult): string {
  const parts: string[] = [];

  parts.push(`# ${result.projectName} — Architecture`);

  parts.push(`## Class Diagram`);
  parts.push(renderClassDiagram(result));

  parts.push(`## Dependency Graph`);
  parts.push(renderDependencyFlowchart(result));

  parts.push(`## Stats`);
  parts.push(`- ${result.stats.totalFiles} files`);
  parts.push(`- ${result.stats.totalLOC} LOC`);
  parts.push(`- ${result.stats.totalSymbols} symbols`);
  parts.push(`- Languages: ${Object.entries(result.stats.languages).map(([k, v]) => `${k}(${v})`).join(", ")}`);

  return parts.join("\n");
}

function renderClassDiagram(result: AnalysisResult): string {
  const lines: string[] = [];
  lines.push("```mermaid");
  lines.push("classDiagram");

  const byFile: Record<string, typeof result.symbols> = {};
  for (const s of result.symbols) {
    const fname = s.filePath.split("/").pop() || s.filePath;
    byFile[fname] = byFile[fname] || [];
    byFile[fname].push(s);
  }

  for (const [fname, symbols] of Object.entries(byFile).slice(0, 20)) {
    const className = fname.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_");
    const publicSymbols = symbols.filter((s) => s.isExported || s.kind === "class" || s.kind === "interface");
    if (publicSymbols.length === 0) continue;

    lines.push(`  class ${className} {`);
    for (const s of publicSymbols.slice(0, 15)) {
      const sig = symbolSignature(s);
      const prefix = s.kind === "class" ? "" : s.kind === "interface" ? "«interface» " : "+";
      lines.push(`    ${prefix}${sig}`);
    }
    lines.push(`  }`);
  }

  lines.push("```");
  return lines.join("\n");
}

function symbolSignature(s: AnalysisResult["symbols"][0]): string {
  const params = s.params.map((p) => {
    let pStr = p.name;
    if (p.type && p.type !== "any") pStr += `: ${p.type}`;
    if (p.defaultValue) pStr += ` = ${p.defaultValue}`;
    return pStr;
  }).join(", ");

  switch (s.kind) {
    case "class":
      return s.extends.length > 0
        ? `${s.name} --|> ${s.extends.join(", ")}`
        : s.name;
    case "method":
      return `${s.name}(${params})`;
    case "function":
      return `${s.name}(${params})${s.returnType ? ` → ${s.returnType}` : ""}`;
    case "interface":
      return s.name;
    default:
      return s.name;
  }
}

function renderDependencyFlowchart(result: AnalysisResult): string {
  const lines: string[] = [];
  const byFile: Map<string, string[]> = new Map();

  for (const s of result.symbols) {
    const fname = s.filePath.split("/").pop() || s.filePath;
    if (!byFile.has(fname)) byFile.set(fname, []);
    byFile.get(fname)!.push(s.name);
  }

  const fileNames = Array.from(byFile.keys()).slice(0, 30);

  lines.push("```mermaid");
  lines.push("flowchart LR");

  const nodeIds = new Map<string, string>();
  fileNames.forEach((f, i) => {
    const id = `F${i}`;
    nodeIds.set(f, id);
    const label = f.replace(/\.[^.]+$/, "");
    const count = byFile.get(f)!.length;
    lines.push(`  ${id}["${escapeMermaid(label)} (${count})"]`);
  });

  for (const dep of result.rawDeps.slice(0, 60)) {
    const fromFile = dep.from.split("/").pop() || dep.from;
    const toFile = dep.to.split("/").pop() || dep.to;
    const fromId = nodeIds.get(fromFile);
    const toId = nodeIds.get(toFile);
    if (fromId && toId && fromId !== toId) {
      lines.push(`  ${fromId} --> ${toId}`);
    }
  }

  if (result.rawDeps.length === 0) {
    lines.push("  NOTE[No dependencies detected]");
  }

  lines.push("```");
  return lines.join("\n");
}

function escapeMermaid(s: string): string {
  return s.replace(/"/g, "#quot;").replace(/[<>]/g, "");
}
