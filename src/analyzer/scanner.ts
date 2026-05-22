import * as fs from "fs";
import * as path from "path";
import type { AnalyzerOptions, SourceFile } from "../types/index.js";

const LANG_MAP: Record<string, string> = {
  ".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".jsx": "jsx",
  ".mjs": "javascript", ".cjs": "javascript",
  ".py": "python", ".go": "go", ".rs": "rust", ".java": "java",
  ".rb": "ruby", ".php": "php", ".swift": "swift",
  ".kt": "kotlin", ".kts": "kotlin",
  ".cs": "csharp", ".cpp": "cpp", ".c": "c", ".h": "c", ".hpp": "cpp",
  ".scala": "scala", ".ex": "elixir", ".exs": "elixir", ".lua": "lua",
  ".r": "r", ".R": "r", ".Rmd": "rmarkdown",
};
const CODE_EXTENSIONS = new Set(Object.keys(LANG_MAP));

function matchesExclude(relativePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const trimmed = pattern.trim();
    if (!trimmed) continue;
    if (relativePath === trimmed || relativePath.startsWith(trimmed + "/")) return true;
    if (trimmed.startsWith("*.") && relativePath.endsWith(trimmed.slice(1))) return true;
    const regex = new RegExp("^" + trimmed.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
    if (regex.test(relativePath)) return true;
  }
  return false;
}
function countLOC(content: string): number { return content.split("\n").filter(l => l.trim().length > 0).length; }

export function scanProject(options: AnalyzerOptions): SourceFile[] {
  const rootDir = path.resolve(options.rootDir);
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) return [];
  const files: SourceFile[] = [];
  function walk(dir: string, depth: number) {
    if (depth > options.maxDepth) return;
    let entries: fs.Dirent[]; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath);
      if (matchesExclude(relPath, options.exclude)) continue;
      if (entry.isDirectory()) { walk(fullPath, depth + 1); }
      else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (!CODE_EXTENSIONS.has(ext)) continue;
        const language = LANG_MAP[ext];
        if (options.languages.length > 0 && !options.languages.includes(language)) continue;
        let content = ""; try { content = fs.readFileSync(fullPath, "utf-8"); } catch { continue; }
        files.push({ path: fullPath, relativePath: relPath, language, loc: countLOC(content) });
      }
    }
  }
  walk(rootDir, 0); return files;
}
