import type { AnalysisResult } from "../types/index.js";

export function renderMermaid(result: AnalysisResult): string {
  const parts: string[] = [];
  parts.push(`# ${result.projectName} — Architecture`);

  parts.push("## Component Diagram");
  parts.push(renderComponentDiagram(result));

  parts.push("## Module Dependencies");
  parts.push(renderModuleGraph(result));

  parts.push("## Stats");
  parts.push(`- ${result.stats.totalFiles} files · ${result.stats.totalLOC} LOC · ${result.stats.totalSymbols} symbols`);
  parts.push(`- Languages: ${Object.entries(result.stats.languages).map(([k, v]) => `${k}(${v})`).join(", ")}`);

  return parts.join("\n");
}

function renderComponentDiagram(result: AnalysisResult): string {
  const components = buildComponents(result);
  if (components.length === 0) return renderFallback(result);

  const lines: string[] = [];
  lines.push("```mermaid");
  lines.push("classDiagram");
  lines.push("  direction TB");

  const names = new Set<string>();
  const relations: string[] = [];

  for (const comp of components) {
    const safeName = safeId(comp.name);
    names.add(safeName);
    lines.push(`  class ${safeName} {`);
    if (comp.stereotype) lines.push(`    <<${comp.stereotype}>>`);
    for (const m of comp.keyMethods) {
      lines.push(`    +${m.name}(${shortParams(m)})`);
    }
    lines.push(`  }`);
  }

  for (const comp of components) {
    for (const dep of comp.dependsOn) {
      const depName = safeId(dep);
      if (names.has(depName) && depName !== safeId(comp.name)) {
        relations.push(`  ${safeId(comp.name)} --> ${depName} : uses`);
      }
    }
  }

  for (const r of dedup(relations)) lines.push(r);
  lines.push("```");
  return lines.join("\n");
}

interface ComponentGroup {
  name: string;
  stereotype: string;
  keyMethods: { name: string; params: string }[];
  dependsOn: string[];
  symbolCount: number;
}

function buildComponents(result: AnalysisResult): ComponentGroup[] {
  const byDir: Record<string, typeof result.symbols> = {};

  for (const s of result.symbols) {
    const parts = s.filePath.split("/");
    parts.pop();
    const dir = parts.length >= 2 ? parts.slice(-2).join("/") : parts[0] || "root";
    byDir[dir] = byDir[dir] || [];
    byDir[dir].push(s);
  }

  const components: ComponentGroup[] = [];
  const fileToDir = new Map<string, string>();
  for (const [dir] of Object.entries(byDir)) {
    for (const s of byDir[dir]) {
      fileToDir.set(s.filePath, dir);
    }
  }

  for (const [dir, symbols] of Object.entries(byDir)) {
    const exports = symbols.filter((s) => s.isExported || s.kind === "class");
    if (exports.length === 0 && symbols.filter((s) => s.kind === "class").length === 0) continue;

    const dirName = dir.split("/").pop() || dir;
    const classes = symbols.filter((s) => s.kind === "class");
    const keyMethods = exports
      .filter((s) => s.kind === "function" || s.kind === "method" || s.kind === "class")
      .slice(0, 8)
      .map((s) => ({
        name: s.kind === "class" ? s.name : (s.name.includes(".") ? s.name.split(".").pop()! : s.name),
        params: s.params.map((p) => p.name).join(", "),
      }));

    const dependsOn: string[] = [];
    for (const dep of result.rawDeps) {
      const targetDir = fileToDir.get(dep.to);
      if (targetDir && targetDir !== dir) dependsOn.push(targetDir);
    }

    components.push({
      name: dirName,
      stereotype: classes.length > 0 ? "service" : "utility",
      keyMethods,
      dependsOn: [...new Set(dependsOn)].slice(0, 5),
      symbolCount: symbols.length,
    });
  }

  return components.slice(0, 15);
}

function renderModuleGraph(result: AnalysisResult): string {
  const byDir: Record<string, typeof result.symbols> = {};
  for (const s of result.symbols) {
    const parts = s.filePath.split("/");
    parts.pop();
    const dir = parts.length >= 2 ? parts.slice(-2).join("/") : parts[0] || "root";
    byDir[dir] = byDir[dir] || [];
    byDir[dir].push(s);
  }

  const dirNames = Object.keys(byDir).slice(0, 20);
  if (dirNames.length === 0) return "";

  const lines: string[] = [];
  lines.push("```mermaid");
  lines.push("flowchart TB");

  const ids = new Map<string, string>();
  dirNames.forEach((d, i) => {
    const id = safeId(d);
    ids.set(d, id);
    const label = d.split("/").pop() || d;
    lines.push(`  ${id}["${label} (${byDir[d].length})"]`);
  });

  const seen = new Set<string>();
  for (const dep of result.rawDeps) {
    const fromDir = findDir(dep.from, dirNames);
    const toDir = findDir(dep.to, dirNames);
    if (!fromDir || !toDir || fromDir === toDir) continue;
    const key = `${ids.get(fromDir)}->${ids.get(toDir)}`;
    if (!seen.has(key)) {
      seen.add(key);
      lines.push(`  ${ids.get(fromDir)} --> ${ids.get(toDir)}`);
    }
  }

  if (seen.size === 0) {
    lines.push("  no_deps[No cross-module dependencies detected]");
  }

  lines.push("```");
  return lines.join("\n");
}

function findDir(filePath: string, dirNames: string[]): string | null {
  const parts = filePath.split("/");
  parts.pop();
  for (let i = parts.length; i >= 1; i--) {
    const candidate = parts.slice(Math.max(0, i - 2), i).join("/");
    if (dirNames.includes(candidate)) return candidate;
  }
  return null;
}

function renderFallback(result: AnalysisResult): string {
  const lines: string[] = [];
  lines.push("```mermaid");
  lines.push("classDiagram");
  const top = result.symbols
    .filter((s) => s.isExported || s.kind === "class")
    .slice(0, 12);
  for (const s of top) {
    lines.push(`  class ${safeId(s.name)} {`);
    if (s.docstring) lines.push(`    <<${s.docstring.slice(0, 50)}>>`);
    lines.push(`    +${s.name}()`);
    lines.push(`  }`);
  }
  lines.push("```");
  return lines.join("\n");
}

function safeId(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+/, "").replace(/^(\d)/, "N$1");
}

function shortParams(m: { params: string }): string {
  const p = m.params;
  if (!p) return "";
  return p.length > 40 ? p.slice(0, 37) + "..." : p;
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr)];
}
