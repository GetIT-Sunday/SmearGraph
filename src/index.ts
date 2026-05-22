import { analyzeProject } from "./analyzer/index.js";
import { renderOutput } from "./visualizer/index.js";
export { analyzeProject, renderOutput };
export type { AnalysisResult, AnalyzerOptions, OutputOptions, OutputFormat, SourceFile, CodeSymbol, Component, DataFlow, ProjectStats, AnalysisIssue } from "./types/index.js";
export interface RunOptions { analyzer: import("./types/index.js").AnalyzerOptions; output: import("./types/index.js").OutputOptions; }
export async function run(options: RunOptions) { const r = analyzeProject(options.analyzer); const o = await renderOutput(r, options.output); return { result: r, output: o }; }
