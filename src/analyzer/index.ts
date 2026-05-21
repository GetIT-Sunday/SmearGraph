import * as fs from "fs";
import * as path from "path";
import { scanProject } from "./scanner.js";
import { extractSymbols } from "./parser.js";
import type { AnalyzerOptions, AnalysisResult, CodeSymbol } from "../types/index.js";

export function analyzeProject(options: AnalyzerOptions): AnalysisResult {
  const rootDir = path.resolve(options.rootDir);
  const files = scanProject(options);

  const allSymbols: CodeSymbol[] = [];
  for (const file of files) {
    allSymbols.push(...extractSymbols(file));
  }

  const stats = {
    totalFiles: files.length,
    totalLOC: files.reduce((sum, f) => sum + f.loc, 0),
    totalSymbols: allSymbols.length,
    totalComponents: 0,
    languages: {} as Record<string, number>,
  };
  for (const f of files) {
    stats.languages[f.language] = (stats.languages[f.language] || 0) + 1;
  }

  const issues: AnalysisResult["issues"] = [];
  if (files.length === 0) {
    issues.push({ severity: "warning", message: "No source code files found" });
  }
  if (allSymbols.length === 0) {
    issues.push({ severity: "info", message: "No classes or functions detected" });
  }

  let projectName = path.basename(rootDir);
  try {
    const pkgPath = path.join(rootDir, "package.json");
    if (fs.existsSync(pkgPath)) {
      projectName = JSON.parse(fs.readFileSync(pkgPath, "utf-8")).name || projectName;
    }
  } catch { /* ignore */ }

  return {
    projectRoot: rootDir,
    projectName,
    analyzedAt: new Date().toISOString(),
    symbols: allSymbols,
    components: [],
    dataFlows: [],
    stats,
    issues,
    rawDeps: [],
  };
}
