import * as fs from "fs";
import * as path from "path";
import { analyzeAndRender } from "./ascii.js";
import { renderMermaid } from "./mermaid.js";
import type { AnalysisResult, OutputOptions } from "../types/index.js";

export async function renderOutput(
  result: AnalysisResult,
  options: OutputOptions
): Promise<string> {
  const { format, outputPath } = options;

  switch (format) {
    case "json": {
      const json = JSON.stringify(result, null, 2);
      if (outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(outputPath, json, "utf-8");
        return outputPath;
      }
      return json;
    }

    case "ascii": {
      const ascii = analyzeAndRender(result, result.components, result.dataFlows);
      if (outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(outputPath, ascii, "utf-8");
        return outputPath;
      }
      return ascii;
    }

    case "mermaid": {
      const md = renderMermaid(result);
      if (outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(outputPath, md, "utf-8");
        return outputPath;
      }
      return md;
    }

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
