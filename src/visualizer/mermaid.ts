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

  const generatedInterfaces = new Set<string>();

  for (const [fname, symbols] of Object.entries(byFile).slice(0, 20)) {
    const fileNs = sanitizeClassName(fname);

    const classes = symbols.filter((s) => s.kind === "class");
    const ifaces = symbols.filter((s) => s.kind === "interface");
    const fns = symbols.filter((s) => s.kind === "function" || s.kind === "method");
    const others = symbols.filter((s) =>
      !["class", "interface", "function", "method"].includes(s.kind)
    );

    for (const cls of classes) {
      if (cls.name.length <= 2 || /^[a-z]+$/.test(cls.name)) continue;
      const clsMethods = symbols.filter((s) => s.parentClass === cls.name && s.kind === "method");
      lines.push(`  class ${sanitizeClassName(cls.name)} {`);
      for (const m of clsMethods.slice(0, 10)) {
        lines.push(`    +${m.name.split(".").pop() || m.name}(${formatParams(m)})`);
      }
      if (cls.docstring) {
        lines.push(`    <<${cls.docstring.slice(0, 40)}>>`);
      }
      lines.push(`  }`);
    }

    for (const iface of ifaces) {
      if (generatedInterfaces.has(iface.name)) continue;
      generatedInterfaces.add(iface.name);
      lines.push(`  class ${sanitizeClassName(iface.name)} {`);
      lines.push(`    <<interface>>`);
      lines.push(`  }`);
    }

    if (classes.length === 0 && fns.length > 0) {
      const nsName = fileNs || `File_${Object.keys(byFile).indexOf(fname)}`;
      lines.push(`  class ${nsName} {`);
      for (const fn of fns.slice(0, 15)) {
        const prefix = fn.isExported ? "+" : "-";
        lines.push(`    ${prefix}${fn.name}(${formatParams(fn)})`);
      }
      lines.push(`  }`);
    }
  }

  lines.push("```");
  return lines.join("\n");
}

function sanitizeClassName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+/, "");
}

function formatParams(s: AnalysisResult["symbols"][0]): string {
  return s.params.map((p) => {
    let pStr = p.name;
    if (p.type && p.type !== "any") pStr += `: ${p.type}`;
    if (p.defaultValue) pStr += ` = ${p.defaultValue}`;
    return pStr;
  }).join(", ");
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

  const seenEdges = new Set<string>();

  for (const dep of result.rawDeps.slice(0, 80)) {
    let fromFile = dep.from.split("/").pop() || dep.from;
    let toFile = dep.to.replace(/^\.\.?\//, "").split("/").pop() || dep.to;

    toFile = toFile.replace(/\.js$/, ".ts").replace(/\.pyc$/, ".py");
    fromFile = fromFile.replace(/\.js$/, ".ts");

    if (toFile.length <= 4 || fromFile.length <= 4) continue;

    const fromId = nodeIds.get(fromFile);
    const toId = nodeIds.get(toFile);
    if (fromId && toId && fromId !== toId) {
      const key = `${fromId}->${toId}`;
      if (!seenEdges.has(key)) {
        seenEdges.add(key);
        lines.push(`  ${fromId} --> ${toId}`);
      }
    }
  }

  if (seenEdges.size === 0) {
    lines.push("  NOTE[No dependencies detected]");
  }

  lines.push("```");
  return lines.join("\n");
}

function escapeMermaid(s: string): string {
  return s.replace(/"/g, "#quot;").replace(/[<>]/g, "");
}
