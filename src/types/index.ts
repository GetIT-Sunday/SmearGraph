export type OutputFormat = "json" | "ascii" | "html";
export interface OutputOptions { format: OutputFormat; outputPath?: string; }
export interface AnalyzerOptions { rootDir: string; exclude: string[]; maxDepth: number; languages: string[]; }
export interface SourceFile { path: string; relativePath: string; language: string; loc: number; }
export type SymbolKind = "class" | "function" | "method" | "interface" | "type" | "enum" | "variable";
export type Language = "typescript" | "javascript" | "python" | "go" | "rust" | "java" | "r" | string;
export interface ParamInfo { name: string; type: string; defaultValue?: string; }
export interface CodeSymbol { name: string; kind: SymbolKind; filePath: string; line: number; parentClass: string; docstring: string; params: ParamInfo[]; returnType: string; isExported: boolean; decorators: string[]; extends: string[]; language: Language; }
export interface Component { name: string; description: string; symbols: CodeSymbol[]; files: string[]; dependsOn: string[]; responsibilities: string[]; isPrimary: boolean; }
export interface DataFlow { from: string; to: string; description: string; dataType: string; direction: "forward" | "backward" | "bidirectional"; }
export interface RawDependency { from: string; to: string; kind: "import" | "call" | "inherit" | "instantiate"; symbols: string[]; }
export interface ProjectStats { totalFiles: number; totalLOC: number; totalSymbols: number; totalComponents: number; languages: Record<string, number>; }
export interface AnalysisIssue { severity: "error" | "warning" | "info"; message: string; location?: string; }
export interface AnalysisResult { projectRoot: string; projectName: string; analyzedAt: string; symbols: CodeSymbol[]; components: Component[]; dataFlows: DataFlow[]; stats: ProjectStats; issues: AnalysisIssue[]; rawDeps: RawDependency[]; }

// ── Knowledge Graph types (Phase 1) ──

export type KGNodeType = "file" | "function" | "class" | "module" | "component" | "concept" | "config" | "document";
export type KGEdgeType = "imports" | "contains" | "calls" | "depends_on" | "extends" | "implements" | "calls_async";

export interface KGNode {
  id: string;
  type: KGNodeType;
  name: string;
  filePath?: string;
  summary?: string;
  tags: string[];
  complexity: "low" | "medium" | "high";
  metadata: Record<string, unknown>;
}

export interface KGEdge {
  source: string;
  target: string;
  type: KGEdgeType;
  weight: number;
}

export interface KGLayer {
  id: string;
  name: string;
  description: string;
  nodeIds: string[];
}

export interface KGTourStep {
  order: number;
  title: string;
  description: string;
  nodeIds: string[];
}

export interface KnowledgeGraph {
  project: {
    name: string;
    description?: string;
    languages: string[];
    frameworks: string[];
    analyzedAt: string;
    gitCommitHash?: string;
  };
  nodes: KGNode[];
  edges: KGEdge[];
  layers: KGLayer[];
  tour?: KGTourStep[];
}

// ── MCP types (Phase 2) ──

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface MCPRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

// ── LLM types (Phase 3) ──

export type LLMProviderType = "openai" | "anthropic" | "gemini";
export interface LLMConfig {
  provider: LLMProviderType;
  apiKey: string;
  model?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface DomainMapping {
  domain: string;
  description: string;
  components: string[];
}
