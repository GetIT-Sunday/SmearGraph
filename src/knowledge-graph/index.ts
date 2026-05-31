import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import type { AnalysisResult, KnowledgeGraph, KGNode, KGEdge, KGLayer, KGTourStep } from "../types/index.js";

const DIR_LAYER_MAP: Record<string, { id: string; name: string; desc: string }> = {
  api: { id: "api", name: "API Layer", desc: "HTTP endpoints, controllers, route handlers" },
  service: { id: "service", name: "Service Layer", desc: "Business logic and service orchestration" },
  data: { id: "data", name: "Data Layer", desc: "Database, models, repositories, data access" },
  db: { id: "data", name: "Data Layer", desc: "Database, models, repositories, data access" },
  model: { id: "data", name: "Data Layer", desc: "Database, models, repositories, data access" },
  store: { id: "data", name: "Data Layer", desc: "Database, models, repositories, data access" },
  ui: { id: "ui", name: "UI Layer", desc: "User interface components and views" },
  component: { id: "ui", name: "UI Layer", desc: "User interface components and views" },
  view: { id: "ui", name: "UI Layer", desc: "User interface components and views" },
  util: { id: "utility", name: "Utility Layer", desc: "Helper functions and shared utilities" },
  helper: { id: "utility", name: "Utility Layer", desc: "Helper functions and shared utilities" },
  lib: { id: "utility", name: "Utility Layer", desc: "Helper functions and shared utilities" },
  config: { id: "config", name: "Config Layer", desc: "Application configuration and settings" },
};

function detectLayersFromComponents(componentFiles: { name: string; files: string[] }[]): KGLayer[] {
  const layerMap = new Map<string, { id: string; name: string; desc: string; nodeIds: Set<string> }>();
  for (const comp of componentFiles) {
    let assigned = false;
    for (const f of comp.files) {
      const parts = f.replace(/\\/g, "/").split("/");
      for (const p of parts) {
        const lower = p.toLowerCase();
        const entry = DIR_LAYER_MAP[lower];
        if (entry) {
          if (!layerMap.has(entry.id)) {
            layerMap.set(entry.id, { ...entry, nodeIds: new Set() });
          }
          layerMap.get(entry.id)!.nodeIds.add(`component:${comp.name}`);
          assigned = true;
          break;
        }
      }
      if (assigned) break;
    }
  }
  return [...layerMap.values()].map(l => ({ id: l.id, name: l.name, description: l.desc, nodeIds: [...l.nodeIds] }));
}

function buildTour(components: { name: string; isPrimary: boolean; dependsOn: string[] }[]): KGTourStep[] {
  const primary = components.filter(c => c.isPrimary);
  const rest = components.filter(c => !c.isPrimary);
  const ordered = [...primary, ...rest];
  const visited = new Set<string>();
  const steps: KGTourStep[] = [];
  let order = 1;
  for (const comp of ordered) {
    if (visited.has(comp.name)) continue;
    visited.add(comp.name);
    const compId = `component:${comp.name}`;
    const depIds = comp.dependsOn.filter(d => visited.has(d)).map(d => `component:${d}`);
    steps.push({ order: order++, title: comp.name, description: "", nodeIds: [compId, ...depIds] });
  }
  return steps;
}

function locToComplexity(loc: number): "low" | "medium" | "high" {
  return loc > 200 ? "high" : loc > 50 ? "medium" : "low";
}

function computeComplexity(node: KGNode): "low" | "medium" | "high" {
  if (node.type === "file") return locToComplexity(node.metadata?.loc as number || 0);
  return node.complexity;
}

export function buildKnowledgeGraph(
  result: AnalysisResult,
  options?: { gitHash?: string }
): KnowledgeGraph {
  const nodeMap = new Map<string, KGNode>();
  const edges: KGEdge[] = [];
  const fileLocMap = new Map<string, number>();

  // File nodes
  const filePaths = new Set<string>();
  for (const sym of result.symbols) {
    filePaths.add(sym.filePath);
  }
  for (const fp of filePaths) {
    const relPath = fp.replace(result.projectRoot, "").replace(/^\//, "");
    let loc = 0;
    try { const c = fs.readFileSync(fp, "utf-8"); loc = c.split("\n").length; } catch { loc = 0; }
    fileLocMap.set(fp, loc);
    const id = `file:${relPath}`;
    nodeMap.set(id, {
      id, type: "file", name: path.basename(fp), filePath: fp,
      tags: [], complexity: locToComplexity(loc), metadata: { loc },
    });
  }

  // Symbol nodes
  for (const sym of result.symbols) {
    const kind = sym.kind === "function" || sym.kind === "method" ? "function" : sym.kind === "class" ? "class" : "function";
    const relPath = sym.filePath.replace(result.projectRoot, "").replace(/^\//, "");
    const id = `${kind}:${relPath}:${sym.name}`;
    const tags: string[] = [];
    if (sym.isExported) tags.push("exported");
    if (sym.parentClass) tags.push(`parent:${sym.parentClass}`);
    nodeMap.set(id, {
      id, type: kind as "function" | "class", name: sym.name,
      filePath: sym.filePath, tags, complexity: "low", metadata: { line: sym.line, params: sym.params, returnType: sym.returnType },
    });
    const fileId = `file:${relPath}`;
    if (nodeMap.has(fileId)) {
      edges.push({ source: fileId, target: id, type: "contains", weight: 1 });
    }
    if (sym.extends.length > 0) {
      for (const parent of sym.extends) {
        edges.push({ source: id, target: `${kind}:${parent}`, type: "extends", weight: 1 });
      }
    }
  }

  // Component nodes
  const fileToComp = new Map<string, string[]>();
  for (const comp of result.components) {
    const id = `component:${comp.name}`;
    nodeMap.set(id, {
      id, type: "component", name: comp.name,
      tags: comp.responsibilities, complexity: locToComplexity(comp.symbols.length), metadata: { description: comp.description },
    });
    for (const f of comp.files) {
      if (!fileToComp.has(f)) fileToComp.set(f, []);
      fileToComp.get(f)!.push(comp.name);
    }
    for (const dep of comp.dependsOn) {
      edges.push({ source: id, target: `component:${dep}`, type: "depends_on", weight: 0.5 });
    }
  }

  // Dependency edges from rawDeps
  for (const dep of result.rawDeps) {
    const fromRel = dep.from.replace(result.projectRoot, "").replace(/^\//, "");
    const toRel = dep.to.startsWith(".") ? path.join(path.dirname(fromRel), dep.to) : dep.to;
    const fromId = `file:${fromRel}`;
    const toId = `file:${toRel}`;
    if (nodeMap.has(fromId) && nodeMap.has(toId)) {
      const eType = dep.kind === "call" ? "calls" : dep.kind === "inherit" ? "extends" : "imports";
      edges.push({ source: fromId, target: toId, type: eType, weight: 0.8 });
    }
  }

  // Component-file relationships
  for (const [filePath, compNames] of fileToComp) {
    const relPath = filePath.replace(result.projectRoot, "").replace(/^\//, "");
    const fileId = `file:${relPath}`;
    for (const cn of compNames) {
      const compId = `component:${cn}`;
      if (nodeMap.has(compId)) {
        edges.push({ source: compId, target: fileId, type: "contains", weight: 1 });
      }
    }
  }

  // Layers
  const compEntries = result.components.map(c => ({ name: c.name, files: c.files }));
  const layers = detectLayersFromComponents(compEntries);

  // Tour
  const compsForTour = result.components.map(c => ({ name: c.name, isPrimary: c.isPrimary, dependsOn: c.dependsOn }));
  const tour = buildTour(compsForTour);

  const nodes = [...nodeMap.values()];
  for (const node of nodes) {
    node.complexity = computeComplexity(node);
  }

  return {
    project: {
      name: result.projectName,
      languages: Object.keys(result.stats.languages),
      frameworks: [],
      analyzedAt: result.analyzedAt,
      gitCommitHash: options?.gitHash,
    },
    nodes,
    edges,
    layers,
    tour,
  };
}

export function buildKnowledgeGraphFromDir(
  rootDir: string,
  result: AnalysisResult,
  options?: { gitHash?: string }
): KnowledgeGraph & { savePath: string } {
  const kg = buildKnowledgeGraph(result, options);
  const dir = path.join(rootDir, ".smeargraph");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const savePath = path.join(dir, "knowledge-graph.json");
  fs.writeFileSync(savePath, JSON.stringify(kg, null, 2), "utf-8");
  return { ...kg, savePath };
}
