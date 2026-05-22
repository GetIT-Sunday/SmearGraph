import * as fs from "fs";
import * as path from "path";
import { analyzeAndRender } from "./ascii.js";
import { renderInteractiveHTML } from "./html.js";
import type { AnalysisResult, OutputOptions } from "../types/index.js";

export async function renderOutput(result: AnalysisResult, options: OutputOptions): Promise<string> {
  const { format, outputPath } = options;
  const writeFile = (p: string, c: string) => { const d = path.dirname(p); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(p, c, "utf-8"); return p; };
  switch (format) {
    case "json": { const json = JSON.stringify(result, null, 2); return outputPath ? writeFile(outputPath, json) : json; }
    case "ascii": { const ascii = analyzeAndRender(result); return outputPath ? writeFile(outputPath, ascii) : ascii; }
    case "html": { const html = renderInteractiveHTML(result); return outputPath ? writeFile(outputPath, html) : html; }
    default: throw new Error("Unsupported format: " + format);
  }
}
