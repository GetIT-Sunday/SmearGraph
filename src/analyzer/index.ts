import * as fs from "fs";
import * as path from "path";
import type { AnalyzerOptions, AnalysisResult, CodeSymbol, RawDependency } from "../types/index.js";
import { scanProject } from "./scanner.js";
import { extractSymbols } from "./parser.js";

function extractImports(filePath: string, language: string): RawDependency[] {
  let content: string; try { content = fs.readFileSync(filePath, "utf-8"); } catch { return []; }
  const deps: RawDependency[] = [];
  if (["typescript","tsx","javascript","jsx"].includes(language)) {
    const re = /(?:import\s+(?:\{[^}]*\}|(\w+)|\*\s+as\s+\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (m[2].startsWith(".")) deps.push({ from: filePath, to: m[2], kind: "import", symbols: [] });
    }
  } else if (language === "python") {
    const re = /^(?:from\s+(\S+)\s+import|import\s+(\S+))/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const pkg = m[1] || m[2];
      if (pkg && (pkg.startsWith(".") || !pkg.includes("."))) deps.push({ from: filePath, to: pkg, kind: "import", symbols: [] });
    }
  }
  return deps;
}

export function analyzeProject(options: AnalyzerOptions): AnalysisResult {
  const rootDir = path.resolve(options.rootDir);
  const files = scanProject(options);
  const allSymbols: CodeSymbol[] = [];
  const allDeps: RawDependency[] = [];
  for (const file of files) { allSymbols.push(...extractSymbols(file)); allDeps.push(...extractImports(file.path, file.language)); }
  const stats = { totalFiles: files.length, totalLOC: files.reduce((s,f) => s+f.loc,0), totalSymbols: allSymbols.length, totalComponents: 0, languages: {} as Record<string,number> };
  for (const f of files) stats.languages[f.language] = (stats.languages[f.language]||0)+1;
  const issues: AnalysisResult["issues"] = [];
  if (files.length === 0) issues.push({ severity: "warning", message: "No source code files found" });
  let projectName = path.basename(rootDir);
  try { const p = path.join(rootDir,"package.json"); if (fs.existsSync(p)) projectName = JSON.parse(fs.readFileSync(p,"utf-8")).name||projectName; } catch {}
  return { projectRoot: rootDir, projectName, analyzedAt: new Date().toISOString(), symbols: allSymbols, components: [], dataFlows: [], stats, issues, rawDeps: allDeps };
}
