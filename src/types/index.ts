/**
 * Shared types for the Cartographer Enhanced architecture analysis agent.
 * Focus: component-level architecture analysis with ASCII diagram rendering.
 */

// ─── Source Code ──────────────────────────────────────────────

export interface SourceFile {
  path: string;
  relativePath: string;
  language: string;
  loc: number;
}

// ─── Code Symbols ─────────────────────────────────────────────

export type SymbolKind = "class" | "function" | "method" | "interface" | "type" | "enum" | "variable";

export type Language = "typescript" | "javascript" | "python" | "go" | "rust" | "java" | "r" | string;

/** A single class, function, or method extracted from source code. */
export interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  filePath: string;
  line: number;
  /** The parent class name (for methods). Empty string if top-level. */
  parentClass: string;
  /** Extracted docstring or leading comment block. */
  docstring: string;
  /** Method/function parameters (name:type pairs). */
  params: ParamInfo[];
  /** Return type if detectable. */
  returnType: string;
  /** Whether this symbol is exported/public. */
  isExported: boolean;
  /** Decorators/annotations (e.g. @Component, @dataclass). */
  decorators: string[];
  /** Base class or implemented interfaces. */
  extends: string[];
  /** Language of the source file. */
  language: Language;
}

export interface ParamInfo {
  name: string;
  type: string;
  defaultValue?: string;
}

// ─── Components ───────────────────────────────────────────────

/** A logical component — groups related symbols that work together. */
export interface Component {
  /** Component name (inferred or user-provided). */
  name: string;
  /** One-sentence description of what this component does. */
  description: string;
  /** The symbols (classes/functions) that belong to this component. */
  symbols: CodeSymbol[];
  /** Files that contain this component's code. */
  files: string[];
  /** Dependencies on other components (by name). */
  dependsOn: string[];
  /** Key responsibilities (bullet points). */
  responsibilities: string[];
  /** Whether this is a primary/top-level component. */
  isPrimary: boolean;
}

// ─── Data Flow ────────────────────────────────────────────────

export interface DataFlow {
  /** Source component name. */
  from: string;
  /** Target component name. */
  to: string;
  /** Description of what data flows. */
  description: string;
  /** Type of data being passed (e.g. "DataFrame", "JSON", "Tensor"). */
  dataType: string;
  /** Direction: forward (→), backward (←), bidirectional (↔). */
  direction: "forward" | "backward" | "bidirectional";
}

// ─── Analysis Result ─────────────────────────────────────────

export interface AnalysisResult {
  projectRoot: string;
  projectName: string;
  analyzedAt: string;
  /** All extracted code symbols. */
  symbols: CodeSymbol[];
  /** Inferred components. Empty if analysis is basic (no LLM). */
  components: Component[];
  /** Inferred data flows. Empty if analysis is basic. */
  dataFlows: DataFlow[];
  /** File-level statistics. */
  stats: ProjectStats;
  /** Issues found during analysis. */
  issues: AnalysisIssue[];
  /** Raw dependency data for agent-level processing. */
  rawDeps: RawDependency[];
}

export interface ProjectStats {
  totalFiles: number;
  totalLOC: number;
  totalSymbols: number;
  totalComponents: number;
  languages: Record<string, number>;
}

export interface AnalysisIssue {
  severity: "error" | "warning" | "info";
  message: string;
  location?: string;
}

// ─── Internal Dependencies ────────────────────────────────────

export interface RawDependency {
  from: string;
  to: string;
  kind: "import" | "call" | "inherit" | "instantiate";
  symbols: string[];
}

// ─── Output ───────────────────────────────────────────────────

export type OutputFormat = "json" | "ascii";

export interface OutputOptions {
  format: OutputFormat;
  outputPath?: string;
}

// ─── Analyzer Options ─────────────────────────────────────────

export interface AnalyzerOptions {
  rootDir: string;
  exclude: string[];
  maxDepth: number;
  languages: string[];
}
