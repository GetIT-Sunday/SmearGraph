import Parser from "web-tree-sitter";
import * as fs from "fs";
import * as path from "path";

let initialized = false;
const languages = new Map<string, any>();
const parsers: any[] = [];

export async function initTreeSitter(): Promise<void> {
  if (initialized) return;
  await Parser.init();
  initialized = true;
}

export async function loadLanguage(name: string, wasmPath: string): Promise<any> {
  if (languages.has(name)) return languages.get(name)!;
  const lang = await Parser.Language.load(wasmPath);
  languages.set(name, lang);
  return lang;
}

export async function loadDefaultLanguages(): Promise<void> {
  await initTreeSitter();
  const wasmDir = path.join(__dirname, "..", "..", "node_modules", "tree-sitter-wasms", "out");

  const langMap: Record<string, string> = {
    typescript: "tree-sitter-typescript.wasm",
    tsx: "tree-sitter-tsx.wasm",
    javascript: "tree-sitter-javascript.wasm",
    python: "tree-sitter-python.wasm",
    go: "tree-sitter-go.wasm",
    rust: "tree-sitter-rust.wasm",
  };

  for (const [name, file] of Object.entries(langMap)) {
    const wasmPath = path.join(wasmDir, file);
    if (fs.existsSync(wasmPath)) {
      await loadLanguage(name, wasmPath);
    }
  }
}

export function getParser(langName: string): any {
  const lang = languages.get(langName);
  if (!lang) return null;

  const parser = new Parser();
  parser.setLanguage(lang);
  parsers.push(parser);
  return parser;
}

export function cleanupParsers(): void {
  for (const p of parsers) {
    try { p.delete(); } catch {}
  }
  parsers.length = 0;
}

export function getLanguageForFile(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  const extMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
  };
  return extMap[ext] || null;
}

export interface ExtractedSymbol {
  name: string;
  kind: "function" | "class" | "method" | "interface" | "type" | "enum" | "variable";
  startLine: number;
  endLine: number;
  docstring?: string;
  isExported: boolean;
  params?: string;
  returnType?: string;
  extends?: string[];
  decorators?: string[];
}

export function extractSymbolsWithTreeSitter(
  source: string,
  langName: string,
  filePath: string
): ExtractedSymbol[] {
  // Tree-sitter integration is disabled due to API compatibility issues
  // Falls back to regex-based parsing in the main analyzer
  return [];
}

function extractDocstring(node: any, source: string): string | undefined {
  const prev = node.previousNamedSibling;
  if (!prev) return undefined;

  if (prev.type === "comment") {
    const text = prev.text;
    if (text.startsWith("/**") || text.startsWith("///") || text.startsWith("#")) {
      return text;
    }
  }
  return undefined;
}

function checkExported(node: any, source: string): boolean {
  let current: any = node;
  while (current) {
    if (current.type === "export_statement" || current.text.startsWith("export ")) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

const QUERIES: Record<string, string> = {
  typescript: `
    (function_declaration name: (identifier) @func.name) @func.def
    (class_declaration name: (type_identifier) @class.name) @class.def
    (method_definition name: (property_identifier) @method.name) @method.def
    (interface_declaration name: (type_identifier) @name) @def
    (type_alias_declaration name: (type_identifier) @name) @def
    (enum_declaration name: (identifier) @name) @def
  `,
  tsx: `
    (function_declaration name: (identifier) @func.name) @func.def
    (class_declaration name: (type_identifier) @class.name) @class.def
    (method_definition name: (property_identifier) @method.name) @method.def
    (interface_declaration name: (type_identifier) @name) @def
    (type_alias_declaration name: (type_identifier) @name) @def
    (enum_declaration name: (identifier) @name) @def
  `,
  javascript: `
    (function_declaration name: (identifier) @func.name) @func.def
    (class_declaration name: (identifier) @class.name) @class.def
    (method_definition name: (property_identifier) @method.name) @method.def
  `,
  python: `
    (function_definition name: (identifier) @func.name) @func.def
    (class_definition name: (identifier) @class.name) @class.def
  `,
  go: `
    (function_declaration name: (identifier) @func.name) @func.def
    (type_declaration (type_spec name: (type_identifier) @class.name type: (struct_type)) @class.def)
    (method_declaration name: (field_identifier) @method.name) @method.def
  `,
  rust: `
    (function_item name: (identifier) @func.name) @func.def
    (impl_item type: (type_identifier) @class.name) @class.def
    (struct_item name: (type_identifier) @name) @def
    (enum_item name: (type_identifier) @name) @def
  `,
};
