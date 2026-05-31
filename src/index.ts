import { analyzeProject } from "./analyzer/index.js";
import { renderOutput, renderInteractiveHTML } from "./visualizer/index.js";
export { analyzeProject, renderOutput, renderInteractiveHTML };
export { buildKnowledgeGraph } from "./knowledge-graph/index.js";
export { validateKnowledgeGraph } from "./knowledge-graph/schema.js";
export { mergeKnowledgeGraphs } from "./knowledge-graph/merge.js";
export { startServer } from "./mcp/index.js";
export { enrichKnowledgeGraph } from "./llm/enrich.js";
export type { AnalysisResult, AnalyzerOptions, OutputOptions, OutputFormat, SourceFile, CodeSymbol, Component, DataFlow, ProjectStats, AnalysisIssue } from "./types/index.js";
export type { KnowledgeGraph, KGNode, KGEdge, KGLayer, KGTourStep, MCPTool, MCPRequest, MCPResponse, LLMConfig, LLMProviderType, DomainMapping } from "./types/index.js";
export interface RunOptions { analyzer: import("./types/index.js").AnalyzerOptions; output: import("./types/index.js").OutputOptions; }
export async function run(options: RunOptions) { const r = analyzeProject(options.analyzer); const o = await renderOutput(r, options.output); return { result: r, output: o }; }
