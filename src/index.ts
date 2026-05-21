import { analyzeProject } from "./analyzer/index.js";
import { renderOutput } from "./visualizer/index.js";
import type { AnalysisResult, AnalyzerOptions, OutputOptions, OutputFormat } from "./types/index.js";

export { analyzeProject, renderOutput };

export type {
  AnalysisResult,
  AnalyzerOptions,
  OutputOptions,
  OutputFormat,
  SourceFile,
  CodeSymbol,
  SymbolKind,
  Component,
  DataFlow,
  ProjectStats,
  AnalysisIssue,
  ParamInfo,
} from "./types/index.js";

export interface RunOptions {
  analyzer: AnalyzerOptions;
  output: OutputOptions;
}

export async function run(options: RunOptions): Promise<{ result: AnalysisResult; output: string }> {
  const result = analyzeProject(options.analyzer);
  const output = await renderOutput(result, options.output);
  return { result, output };
}
