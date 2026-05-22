import { buildComponents, buildEdges, type CompNode, type CompEdge } from "../analyzer/components.js";
import type { AnalysisResult } from "../types/index.js";

const A = (code: number) => (s: string) => `\x1b[${code}m${s}\x1b[0m`;
const bold = A(1), dim = A(2), red = A(31), green = A(32), yellow = A(33), blue = A(34), magenta = A(35), cyan = A(36), white = A(37);
const colorFn: Record<number, (s: string) => string> = { 0: blue, 1: green, 2: yellow, 3: red, 4: magenta, 5: cyan, 6: white, 7: (s: string) => s };

export function analyzeAndRender(result: AnalysisResult): string {
  const comps = buildComponents(result);
  const edges = buildEdges(result, comps);
  if (comps.length === 0) return renderSymbolFallback(result);
  return renderArchDiagram(result, comps, edges);
}

function renderArchDiagram(result: AnalysisResult, comps: CompNode[], edges: CompEdge[]): string {
  const W = 76;
  const hr = "─".repeat(W - 2);
  const lines: string[] = [];
  const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - stripAnsi(s).length));

  lines.push("┌" + hr + "┐");
  lines.push("│  " + bold(blue(result.projectName)));

  lines.push("├" + hr + "┤");
  lines.push("│  " + bold("Components") + " ".repeat(20) + dim(`${comps.length} groups · ${result.stats.totalFiles} files · ${result.stats.totalLOC.toLocaleString()} LOC`) + " ".repeat(Math.max(0, W - 45 - `${comps.length}${result.stats.totalFiles}${result.stats.totalLOC}`.length)));
  lines.push("│");

  let maxR = 0;
  for (let i = 0; i < comps.length; i++) {
    const c = comps[i];
    const color = colorFn[i % 8] || ((s: string) => s);
    const depsIn = edges.filter(e => e.target === i).map(e => comps[e.source].name);
    const depsOut = edges.filter(e => e.source === i).map(e => comps[e.target].name);
    const icon = c.name.includes("Entry") || c.name.includes("CLI") ? "▶" : "■";
    const left = `│  ${color(icon)} ${bold(c.name)}`;
    const right = dim(`${c.files}f · ${c.symbols}s`);
    const rlen = Math.max(right.length, depsOut.map(d => ("→ " + d).length).reduce((m, l) => Math.max(m, l), 0));
    maxR = Math.max(maxR, rlen);
    const spacing = Math.max(2, W - stripAnsi(left).length - rlen - 4);
    lines.push(left + " ".repeat(spacing) + right);
    if (depsOut.length > 0) {
      for (const d of depsOut.slice(0, 3)) {
        const arrow = dim("──→ ") + (colorFn[comps.findIndex(x => x.name === d) % 8] || ((s: string) => s))(d);
        lines.push("│" + " ".repeat(stripAnsi(left).length) + " ".repeat(spacing - 4) + arrow);
      }
    }
  }

  if (edges.length > 0) {
    lines.push("│");
    lines.push("├" + hr + "┤");
    lines.push("│  " + bold("Dependency Summary"));
    const shown = new Set<string>();
    for (const e of edges) {
      const key = comps[e.source].name + "→" + comps[e.target].name;
      if (shown.has(key)) continue;
      shown.add(key);
      const sc = colorFn[e.source % 8] || ((s: string) => s);
      const tc = colorFn[e.target % 8] || ((s: string) => s);
      lines.push("│    " + sc(comps[e.source].name) + " " + dim("──→") + " " + tc(comps[e.target].name));
    }
  }

  lines.push("└" + hr + "┘");
  return lines.join("\n");
}

function renderSymbolFallback(result: AnalysisResult): string {
  const lines: string[] = [];
  lines.push("┌" + "─".repeat(68) + "┐");
  lines.push("│  " + bold(result.projectName).padEnd(74) + "│");
  lines.push("│  " + dim(result.stats.totalFiles + " files · " + result.stats.totalLOC + " LOC").padEnd(74) + "│");
  for (const s of result.symbols.filter(s => s.isExported || s.kind === "class").slice(0, 12)) {
    lines.push("│  " + ("[" + s.kind + "] " + s.name).slice(0, 64).padEnd(66) + "│");
  }
  lines.push("└" + "─".repeat(68) + "┘");
  return lines.join("\n");
}

function stripAnsi(s: string): string { return s.replace(/\x1b\[\d+m/g, ""); }
