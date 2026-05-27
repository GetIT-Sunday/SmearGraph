import type { AnalysisResult } from "../types/index.js";

export interface CompNode {
  name: string; desc: string; files: number; symbols: number;
  color: string; paths: string[];
}
export interface CompEdge { source: number; target: number; confidence: number; }

const COLORS = ["#58a6ff","#3fb950","#d2991d","#f85149","#bc8cff","#79c0ff","#56d364","#e3b341"];
const CONFIDENCE_THRESHOLD = 3;

export function buildComponents(result: AnalysisResult): CompNode[] {
  const byName: Record<string, { files: Set<string>; symbols: number; desc: string; priority: number }> = {};
  for (const s of result.symbols) {
    const key = componentKey(s.filePath, result.projectRoot);
    byName[key] = byName[key] || { files: new Set(), symbols: 0, desc: "", priority: keyPriority(key) };
    byName[key].files.add(s.filePath); byName[key].symbols++;
    if (s.docstring && !byName[key].desc) byName[key].desc = s.docstring.slice(0, 80);
  }
  for (const dep of result.rawDeps) {
    if (!dep.from) continue;
    const key = componentKey(dep.from, result.projectRoot);
    byName[key] = byName[key] || { files: new Set(), symbols: 0, desc: "", priority: keyPriority(key) };
    byName[key].files.add(dep.from);
  }
  const sorted = Object.entries(byName)
    .filter(([,v]) => v.files.size >= 2 || v.symbols > 0)
    .sort(([,a],[,b]) => b.priority - a.priority || b.files.size - a.files.size)
    .slice(0, 16);
  return sorted.map(([name, info], i) => ({
    name, desc: info.desc, files: info.files.size, symbols: info.symbols,
    color: COLORS[i % COLORS.length], paths: [...info.files],
  }));
}

export function buildEdges(result: AnalysisResult, comps: CompNode[]): CompEdge[] {
  const fileToComp = new Map<string, number>();
  for (let i = 0; i < comps.length; i++) for (const p of comps[i].paths) fileToComp.set(p, i);

  const edgeCount = new Map<string, number>();
  const builtins = new Set(["os","sys","re","json","typing","io","pathlib","datetime","collections","argparse","logging","__future__","numpy","pandas","torch","matplotlib","warnings","traceback","itertools","functools","subprocess","shutil","tempfile","copy","hashlib","random","csv","math","time","abc","dataclasses","enum","textwrap","pprint","types","inspect","contextlib"]);

  for (const dep of result.rawDeps) {
    if (builtins.has(dep.to.split(".")[0])) continue;
    const fc = fileToComp.get(dep.from);
    if (fc === undefined) continue;
    let toPath = dep.to;
    if (toPath.startsWith(".")) {
      const fd = dep.from.substring(0, dep.from.lastIndexOf("/"));
      const base = fd.split("/");
      if (toPath.includes("/")) { for (const p of toPath.split("/")) { if (p==="..") base.pop(); else if (p!==".") base.push(p); } }
      else { const pkg = toPath.replace(/^\.+/, ""); if (pkg) base.push(pkg + ".py"); }
      toPath = base.join("/");
    } else { toPath = result.projectRoot + "/" + toPath.replace(/\./g, "/") + ".py"; }
    if (!toPath.startsWith("/")) toPath = result.projectRoot + "/" + toPath;
    toPath = toPath.replace(/\.js$/, ".ts").replace(/\.jsx$/, ".tsx").replace(/\.pyc$/, ".py");
    let tc = fileToComp.get(toPath);
    if (tc === undefined) tc = fileToComp.get(toPath + "/__init__.py") || undefined;
    if (tc === undefined) { for (let i = 0; i < comps.length; i++) { if (i===fc) continue; for (const p of comps[i].paths) { if (p.startsWith(toPath.replace(/\.py$/,""))||toPath.includes(p.split("/").slice(-2,-1)[0]||"")) { tc=i; break; } } if (tc!==undefined) break; } }
    if (tc !== undefined && tc !== fc) {
      const key = fc + "->" + tc;
      edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
    }
  }

  return Array.from(edgeCount.entries()).map(([key, count]) => {
    const [s, t] = key.split("->").map(Number);
    const confidence = Math.min(100, Math.round((count / CONFIDENCE_THRESHOLD) * 100));
    return { source: s, target: t, confidence };
  }).sort((a, b) => b.confidence - a.confidence);
}

function componentKey(fp: string, root: string): string {
  const rel = fp.startsWith(root) ? fp.slice(root.length).replace(/^\//, "") : fp;
  const known: Record<string,string> = {"layers/feature_extraction":"Feature Extraction","layers/grammar_analysis":"Grammar Analysis","layers/semantic_analysis":"Semantic (E2E)","layers/pragmatic_analysis":"Pragmatic (DL)","layers/grounding":"Grounding","layers/visualization":"Visualization","configuration":"Configuration","configs":"Configuration","web_api":"Web API","biogsp":"CLI / Entry","core":"Core","scripts":"Scripts","tests":"Tests","data":"Data","docs":"Docs"};
  for (const [p,l] of Object.entries(known)) if (rel.startsWith(p)) return l;
  const parts = rel.split("/");
  if (parts.length>=2) { const parent = parts.slice(0,-1).join("/"); for (const [p,l] of Object.entries(known)) if (parent.startsWith(p)) return l; }
  return parts[0]||"Other";
}
function keyPriority(k: string): number { const o: Record<string,number>={"CLI / Entry":100,"Feature Extraction":90,"Semantic (E2E)":85,"Grammar Analysis":80,"Pragmatic (DL)":75,"Grounding":70,"Visualization":65,"Configuration":60,"Core":55,"Web API":50,"Scripts":40,"Tests":30,"Data":20}; return o[k]||0; }
