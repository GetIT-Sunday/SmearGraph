import * as fs from "fs";
import type { CodeSymbol, SymbolKind, ParamInfo, SourceFile } from "../types/index.js";

function extractTSJS(content: string, filePath: string, language: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const lines = content.split("\n");

  const patterns: { regex: RegExp; kind: SymbolKind; group: number }[] = [
    { regex: /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g, kind: "class", group: 1 },
    { regex: /(?:export\s+)?interface\s+(\w+)/g, kind: "interface", group: 1 },
    { regex: /(?:export\s+)?type\s+(\w+)\s*=/g, kind: "type", group: 1 },
    { regex: /(?:export\s+)?enum\s+(\w+)/g, kind: "enum", group: 1 },
    { regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g, kind: "function", group: 1 },
    { regex: /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g, kind: "function", group: 1 },
  ];

  for (const { regex, kind, group } of patterns) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const name = match[group];
      if (!name || name === "if" || name === "for" || name === "while" || name === "switch") continue;
      const lineNum = content.substring(0, match.index).split("\n").length;
      const docstring = extractDocstring(lines, lineNum - 1);
      const isExported = match[0].includes("export");
      const extendsMatch = match[0].match(/(?:extends|implements)\s+([^{]+)/);
      const extends_ = extendsMatch
        ? extendsMatch[1].split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      symbols.push({
        name, kind, filePath, line: lineNum, parentClass: "",
        docstring,
        params: kind === "function" ? extractParams(match[0]) : [],
        returnType: "", isExported,
        decorators: extractDecorators(lines, lineNum - 1),
        extends: extends_, language,
      });
    }
  }

  for (const { regex, kind, group } of patterns) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      if (kind !== "class") continue;
      const name = match[group];
      if (!name) continue;
      const classBody = extractBlock(content, match.index, "{", "}");
      extractMethods(classBody, filePath, name, symbols, language);
    }
  }

  return symbols;
}

function extractMethods(
  classBody: string, filePath: string, className: string,
  symbols: CodeSymbol[], language: string
): void {
  const methodRegex = /(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = methodRegex.exec(classBody)) !== null) {
    const name = match[1];
    if (["constructor", "if", "for", "while", "switch", "return", "throw", "new"].includes(name)) continue;
    symbols.push({
      name: `${className}.${name}`, kind: "method", filePath, line: 0,
      parentClass: className, docstring: "",
      params: extractParams(match[0]), returnType: "",
      isExported: true, decorators: [], extends: [], language,
    });
  }
}

function extractPython(content: string, filePath: string, language: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const lines = content.split("\n");

  const classRegex = /^class\s+(\w+)\s*(?:\(([^)]*)\))?:/gm;
  let match: RegExpExecArray | null;
  while ((match = classRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length;
    symbols.push({
      name: match[1], kind: "class", filePath, line: lineNum, parentClass: "",
      docstring: extractDocstring(lines, lineNum - 1), params: [], returnType: "",
      isExported: !match[1].startsWith("_"),
      decorators: extractPythonDecorators(lines, lineNum - 1),
      extends: match[2] ? match[2].split(",").map((s: string) => s.trim()) : [],
      language,
    });
  }

  const funcRegex = /^def\s+(\w+)\s*\(([^)]*)\)/gm;
  while ((match = funcRegex.exec(content)) !== null) {
    if (match[1].startsWith("_") && match[1] !== "__init__") continue;
    const lineNum = content.substring(0, match.index).split("\n").length;
    if (isInsidePythonClass(content, match.index)) continue;
    symbols.push({
      name: match[1], kind: "function", filePath, line: lineNum, parentClass: "",
      docstring: extractDocstring(lines, lineNum - 1),
      params: extractPythonParams(match[2]),
      returnType: extractPythonReturn(lines, lineNum - 1),
      isExported: !match[1].startsWith("_"),
      decorators: extractPythonDecorators(lines, lineNum - 1),
      extends: [], language,
    });
  }

  return symbols;
}

function isInsidePythonClass(content: string, pos: number): boolean {
  const before = content.substring(0, pos);
  const lines = before.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("class ")) return true;
    if (trimmed && !trimmed.startsWith(" ") && !trimmed.startsWith("\t") && !trimmed.startsWith("def ")) return false;
  }
  return false;
}

function extractGo(content: string, filePath: string, language: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const lines = content.split("\n");

  const structRegex = /^type\s+(\w+)\s+struct\s*\{/gm;
  let match: RegExpExecArray | null;
  while ((match = structRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length;
    symbols.push({
      name: match[1], kind: "class", filePath, line: lineNum, parentClass: "",
      docstring: extractDocstring(lines, lineNum - 1), params: [], returnType: "",
      isExported: match[1][0] === match[1][0].toUpperCase(),
      decorators: [], extends: [], language,
    });
  }

  const funcRegex = /^func\s+(?:\((\w+)\s+\*?(\w+)\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*\(([^)]*)\)|\s+(\S+))?\s*\{/gm;
  while ((match = funcRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length;
    const receiver = match[1] ? match[2] : "";
    const funcName = match[3];
    symbols.push({
      name: receiver ? `${receiver}.${funcName}` : funcName,
      kind: receiver ? "method" : "function", filePath, line: lineNum,
      parentClass: receiver, docstring: extractDocstring(lines, lineNum - 1),
      params: extractGoParams(match[4]),
      returnType: match[5] || match[6] || "",
      isExported: funcName[0] === funcName[0].toUpperCase(),
      decorators: [], extends: [], language,
    });
  }

  return symbols;
}

function extractRust(content: string, filePath: string, language: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const lines = content.split("\n");

  const structRegex = /(?:pub\s+)?struct\s+(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = structRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length;
    symbols.push({
      name: match[1], kind: "class", filePath, line: lineNum, parentClass: "",
      docstring: extractDocstring(lines, lineNum - 1), params: [], returnType: "",
      isExported: match[0].includes("pub"),
      decorators: extractRustAttributes(lines, lineNum - 1), extends: [], language,
    });
  }

  const enumRegex = /(?:pub\s+)?enum\s+(\w+)/g;
  while ((match = enumRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length;
    symbols.push({
      name: match[1], kind: "enum", filePath, line: lineNum, parentClass: "",
      docstring: extractDocstring(lines, lineNum - 1), params: [], returnType: "",
      isExported: match[0].includes("pub"), decorators: [], extends: [], language,
    });
  }

  const fnRegex = /(?:pub\s+)?fn\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\S+))?/g;
  while ((match = fnRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length;
    symbols.push({
      name: match[1], kind: "function", filePath, line: lineNum, parentClass: "",
      docstring: extractDocstring(lines, lineNum - 1),
      params: extractRustParams(match[2]),
      returnType: match[3] || "",
      isExported: match[0].includes("pub"),
      decorators: extractRustAttributes(lines, lineNum - 1), extends: [], language,
    });
  }

  return symbols;
}

function extractR(sourceFile: SourceFile): CodeSymbol[] {
  const content = fs.readFileSync(sourceFile.path, "utf-8");
  const symbols: CodeSymbol[] = [];
  const lines = content.split("\n");

  const funcRegex = /(?:(\w+)\s*<-\s*)?function\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = funcRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length;
    const name = match[1] || `anonymous_${lineNum}`;
    symbols.push({
      name, kind: "function", filePath: sourceFile.path,
      line: lineNum, parentClass: "", docstring: extractRDocstring(lines, lineNum - 1),
      params: extractRParams(match[2]), returnType: "",
      isExported: checkRExport(content, name), decorators: [], extends: [], language: "r",
    });
  }

  const s4Class = /setClass\s*\(\s*"(\w+)"/g;
  while ((match = s4Class.exec(content)) !== null) {
    symbols.push({
      name: match[1], kind: "class", filePath: sourceFile.path,
      line: content.substring(0, match.index).split("\n").length,
      parentClass: "", docstring: "", params: [], returnType: "",
      isExported: true, decorators: [], extends: [], language: "r",
    });
  }

  return symbols;
}

function extractDocstring(lines: string[], declLine: number): string {
  const docLines: string[] = [];
  for (let i = declLine - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("/**") || line.startsWith("*") || line.startsWith("*/"))
      docLines.unshift(line.replace(/^\/\*\*\s*|^\*\s*|\*\/$/g, "").trim());
    else if (line.startsWith("//") || line.startsWith("///"))
      docLines.unshift(line.replace(/^\/\/\/?\s*/, "").trim());
    else if (line.startsWith('"""') || line.startsWith("'''"))
      docLines.unshift(line.replace(/^"{3}\s*|'{3}\s*/g, "").trim());
    else if (!line || line.startsWith("#")) {
      if (line.startsWith("#")) docLines.unshift(line.replace(/^#\s*/, ""));
      continue;
    } else break;
  }
  return docLines.join(" ").slice(0, 500);
}

function extractRDocstring(lines: string[], funcLine: number): string {
  const docLines: string[] = [];
  for (let i = funcLine - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("#'")) docLines.unshift(line.replace(/^#'\s*/, ""));
    else if (!line || line.startsWith("#")) continue;
    else break;
  }
  return docLines.join(" ").slice(0, 300);
}

function checkRExport(content: string, name: string): boolean {
  return new RegExp(`export\\s*\\(\\s*"${name}"\\s*\\)`).test(content) ||
    new RegExp(`export\\s*\\(\\s*${name}\\s*\\)`).test(content);
}

function extractBlock(content: string, start: number, open: string, close: string): string {
  let depth = 0;
  let started = false;
  for (let i = start; i < content.length; i++) {
    if (content[i] === open) { depth++; started = true; }
    else if (content[i] === close) { depth--; if (depth === 0 && started) return content.substring(start, i + 1); }
  }
  return "";
}

function extractParams(signature: string): ParamInfo[] {
  const match = signature.match(/\(([^)]*)\)/);
  if (!match || !match[1].trim()) return [];
  return match[1].split(",").map((p: string) => {
    const parts = p.trim().split(/:\s*/);
    return parts.length >= 2
      ? { name: parts[0].trim(), type: parts[1].trim() }
      : { name: parts[0].trim(), type: "any" };
  });
}

function extractPythonParams(params: string): ParamInfo[] {
  if (!params.trim()) return [];
  return params.split(",").map((p: string) => {
    const trimmed = p.trim();
    const colonIdx = trimmed.indexOf(":");
    const eqIdx = trimmed.indexOf("=");
    if (colonIdx >= 0) {
      const name = trimmed.substring(0, colonIdx).trim();
      const rest = trimmed.substring(colonIdx + 1).trim();
      const eqInRest = rest.indexOf("=");
      return eqInRest >= 0
        ? { name, type: rest.substring(0, eqInRest).trim(), defaultValue: rest.substring(eqInRest + 1).trim() }
        : { name, type: rest };
    }
    if (eqIdx >= 0)
      return { name: trimmed.substring(0, eqIdx).trim(), type: "any", defaultValue: trimmed.substring(eqIdx + 1).trim() };
    return { name: trimmed, type: "any" };
  });
}

function extractPythonReturn(lines: string[], defLine: number): string {
  for (let i = defLine + 1; i < Math.min(defLine + 20, lines.length); i++) {
    const match = lines[i].trim().match(/^:returns?:\s*(.+)/);
    if (match) return match[1].trim();
  }
  return "";
}

function extractGoParams(params: string): ParamInfo[] {
  if (!params.trim()) return [];
  return params.split(",").map((p: string) => {
    const parts = p.trim().split(/\s+/);
    return parts.length >= 2
      ? { name: parts[0], type: parts.slice(1).join(" ") }
      : { name: parts[0], type: "any" };
  });
}

function extractRustParams(params: string): ParamInfo[] {
  if (!params.trim()) return [];
  const stripped = params.trim().replace(/^&?(?:mut\s+)?self\s*,?\s*/, "");
  if (!stripped) return [];
  return stripped.split(",").map((p: string) => {
    const parts = p.trim().split(":");
    return parts.length >= 2
      ? { name: parts[0].trim(), type: parts.slice(1).join(":").trim() }
      : { name: parts[0].trim(), type: "any" };
  });
}

function extractRParams(params: string): ParamInfo[] {
  if (!params.trim()) return [];
  return params.split(",").map((p: string) => {
    const trimmed = p.trim();
    const eqIdx = trimmed.indexOf("=");
    return eqIdx >= 0
      ? { name: trimmed.substring(0, eqIdx).trim(), type: "any", defaultValue: trimmed.substring(eqIdx + 1).trim() }
      : { name: trimmed, type: "any" };
  });
}

function extractDecorators(lines: string[], declLine: number): string[] {
  const decs: string[] = [];
  for (let i = declLine - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("@")) decs.unshift(line);
    else if (!line) continue;
    else break;
  }
  return decs;
}

function extractPythonDecorators(lines: string[], declLine: number): string[] {
  const decs: string[] = [];
  for (let i = declLine - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("@")) decs.unshift(line);
    else if (!line || line.startsWith("#")) continue;
    else break;
  }
  return decs;
}

function extractRustAttributes(lines: string[], declLine: number): string[] {
  const attrs: string[] = [];
  for (let i = declLine - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("#[")) attrs.unshift(line);
    else if (!line) continue;
    else break;
  }
  return attrs;
}

export function extractSymbols(file: SourceFile): CodeSymbol[] {
  let content: string;
  try {
    content = fs.readFileSync(file.path, "utf-8");
  } catch {
    return [];
  }

  switch (file.language) {
    case "typescript":
    case "tsx":
    case "javascript":
    case "jsx":
      return extractTSJS(content, file.path, file.language);
    case "python":
      return extractPython(content, file.path, file.language);
    case "go":
      return extractGo(content, file.path, file.language);
    case "rust":
      return extractRust(content, file.path, file.language);
    case "r":
      return extractR(file);
    default:
      return [];
  }
}
