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
