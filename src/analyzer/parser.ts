import * as fs from "fs";
import type { CodeSymbol, SymbolKind, ParamInfo, SourceFile } from "../types/index.js";

function extractTSJS(content: string, filePath: string, language: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = []; const lines = content.split("\n");
  const patterns: { regex: RegExp; kind: SymbolKind; group: number }[] = [
    { regex: /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g, kind: "class", group: 1 },
    { regex: /(?:export\s+)?interface\s+(\w+)/g, kind: "interface", group: 1 },
    { regex: /(?:export\s+)?type\s+(\w+)\s*=/g, kind: "type", group: 1 },
    { regex: /(?:export\s+)?enum\s+(\w+)/g, kind: "enum", group: 1 },
    { regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g, kind: "function", group: 1 },
  ];
  for (const { regex, kind, group } of patterns) { regex.lastIndex = 0; let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      const name = m[group]; if (!name || ["if","for","while","switch"].includes(name)) continue;
      const lineNum = content.substring(0,m.index).split("\n").length;
      const extendsMatch = m[0].match(/(?:extends|implements)\s+([^{]+)/);
      symbols.push({ name, kind, filePath, line: lineNum, parentClass: "", docstring: extractDocstring(lines,lineNum-1),
        params: kind==="function"?extractParams(m[0]):[], returnType: "", isExported: m[0].includes("export"),
        decorators: extractDecorators(lines,lineNum-1),
        extends: extendsMatch ? extendsMatch[1].split(",").map((s:string)=>s.trim()).filter(Boolean) : [], language });
    }
  }
  return symbols;
}

function extractPython(content: string, filePath: string, language: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = []; const lines = content.split("\n");
  const classRegex = /^class\s+(\w+)\s*(?:\(([^)]*)\))?:/gm; let m: RegExpExecArray | null;
  while ((m = classRegex.exec(content)) !== null) {
    const lineNum = content.substring(0,m.index).split("\n").length;
    symbols.push({ name: m[1], kind: "class", filePath, line: lineNum, parentClass: "", docstring: extractDocstring(lines,lineNum-1), params: [], returnType: "",
      isExported: !m[1].startsWith("_"), decorators: extractPythonDecorators(lines,lineNum-1),
      extends: m[2] ? m[2].split(",").map((s:string)=>s.trim()) : [], language });
  }
  const funcRegex = /^def\s+(\w+)\s*\(([^)]*)\)/gm;
  while ((m = funcRegex.exec(content)) !== null) {
    if (m[1].startsWith("_") && m[1] !== "__init__") continue;
    const lineNum = content.substring(0,m.index).split("\n").length;
    if (isInsidePythonClass(content,m.index)) continue;
    symbols.push({ name: m[1], kind: "function", filePath, line: lineNum, parentClass: "", docstring: extractDocstring(lines,lineNum-1),
      params: extractPythonParams(m[2]), returnType: extractPythonReturn(lines,lineNum-1), isExported: !m[1].startsWith("_"),
      decorators: extractPythonDecorators(lines,lineNum-1), extends: [], language });
  }
  return symbols;
}
function isInsidePythonClass(content: string, pos: number): boolean {
  const before = content.substring(0,pos).split("\n");
  for (let i=before.length-1;i>=0;i--) { const t=before[i].trim(); if (t.startsWith("class ")) return true; if (t&&!t.startsWith(" ")&&!t.startsWith("\t")&&!t.startsWith("def ")) return false; }
  return false;
}

function extractGo(content: string, filePath: string, language: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = []; const lines = content.split("\n");
  const structRegex = /^type\s+(\w+)\s+struct\s*\{/gm; let m: RegExpExecArray | null;
  while ((m = structRegex.exec(content)) !== null) {
    const lineNum = content.substring(0,m.index).split("\n").length;
    symbols.push({ name: m[1], kind: "class", filePath, line: lineNum, parentClass: "", docstring: extractDocstring(lines,lineNum-1), params: [], returnType: "",
      isExported: m[1][0]===m[1][0].toUpperCase(), decorators: [], extends: [], language });
  }
  const funcRegex = /^func\s+(?:\((\w+)\s+\*?(\w+)\)\s+)?(\w+)\s*\(([^)]*)\)/gm;
  while ((m = funcRegex.exec(content)) !== null) {
    const lineNum = content.substring(0,m.index).split("\n").length; const receiver = m[1]?m[2]:""; const funcName = m[3];
    symbols.push({ name: receiver?receiver+"."+funcName:funcName, kind: receiver?"method":"function", filePath, line: lineNum, parentClass: receiver,
      docstring: extractDocstring(lines,lineNum-1), params: extractGoParams(m[4]), returnType: "",
      isExported: funcName[0]===funcName[0].toUpperCase(), decorators: [], extends: [], language });
  }
  return symbols;
}

function extractRust(content: string, filePath: string, language: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = []; const lines = content.split("\n"); let m: RegExpExecArray | null;
  const structRegex = /(?:pub\s+)?struct\s+(\w+)/g;
  while ((m = structRegex.exec(content)) !== null) { const lineNum = content.substring(0,m.index).split("\n").length;
    symbols.push({ name: m[1], kind: "class", filePath, line: lineNum, parentClass: "", docstring: extractDocstring(lines,lineNum-1), params: [], returnType: "",
      isExported: m[0].includes("pub"), decorators: extractRustAttributes(lines,lineNum-1), extends: [], language }); }
  const enumRegex = /(?:pub\s+)?enum\s+(\w+)/g;
  while ((m = enumRegex.exec(content)) !== null) { const lineNum = content.substring(0,m.index).split("\n").length;
    symbols.push({ name: m[1], kind: "enum", filePath, line: lineNum, parentClass: "", docstring: extractDocstring(lines,lineNum-1), params: [], returnType: "",
      isExported: m[0].includes("pub"), decorators: [], extends: [], language }); }
  const fnRegex = /(?:pub\s+)?fn\s+(\w+)\s*\(([^)]*)\)/g;
  while ((m = fnRegex.exec(content)) !== null) { const lineNum = content.substring(0,m.index).split("\n").length;
    symbols.push({ name: m[1], kind: "function", filePath, line: lineNum, parentClass: "", docstring: extractDocstring(lines,lineNum-1),
      params: extractRustParams(m[2]), returnType: "", isExported: m[0].includes("pub"),
      decorators: extractRustAttributes(lines,lineNum-1), extends: [], language }); }
  return symbols;
}

function extractR(sourceFile: SourceFile): CodeSymbol[] {
  const content = fs.readFileSync(sourceFile.path,"utf-8"); const symbols: CodeSymbol[] = []; const lines = content.split("\n");
  const funcRegex = /(?:(\w+)\s*<-\s*)?function\s*\(([^)]*)\)/g; let m: RegExpExecArray | null;
  while ((m = funcRegex.exec(content)) !== null) { const lineNum = content.substring(0,m.index).split("\n").length; const name = m[1]||"anonymous_"+lineNum;
    symbols.push({ name, kind: "function", filePath: sourceFile.path, line: lineNum, parentClass: "", docstring: extractRDocstring(lines,lineNum-1),
      params: extractRParams(m[2]), returnType: "", isExported: checkRExport(content,name), decorators: [], extends: [], language: "r" }); }
  const s4Class = /setClass\s*\(\s*"(\w+)"/g;
  while ((m = s4Class.exec(content)) !== null) symbols.push({ name: m[1], kind: "class", filePath: sourceFile.path, line: content.substring(0,m.index).split("\n").length, parentClass: "", docstring: "", params: [], returnType: "", isExported: true, decorators: [], extends: [], language: "r" });
  return symbols;
}

function extractDocstring(lines: string[], declLine: number): string {
  const doc: string[] = [];
  for (let i=declLine-1;i>=0;i--) { const l=lines[i].trim();
    if (l.startsWith("/**")||l.startsWith("*")||l.startsWith("*/")) doc.unshift(l.replace(/^\/\*\*\s*|^\*\s*|\*\/$/g,"").trim());
    else if (l.startsWith("//")||l.startsWith("///")) doc.unshift(l.replace(/^\/\/\/?\s*/,"").trim());
    else if (l.startsWith('"""')||l.startsWith("'''")) doc.unshift(l.replace(/^"{3}\s*|'{3}\s*/g,"").trim());
    else if (!l||l.startsWith("#")) { if (l.startsWith("#")) doc.unshift(l.replace(/^#\s*/,"")); continue; }
    else break;
  }
  return doc.join(" ").slice(0,500);
}
function extractRDocstring(lines: string[], funcLine: number): string { const doc: string[] = []; for (let i=funcLine-1;i>=0;i--) { const l=lines[i].trim(); if (l.startsWith("#'")) doc.unshift(l.replace(/^#'\s*/,"")); else if (!l||l.startsWith("#")) continue; else break; } return doc.join(" ").slice(0,300); }
function checkRExport(content: string, name: string): boolean { return new RegExp("export\\s*\\(\\s*\""+name+"\"\\s*\\)").test(content)||new RegExp("export\\s*\\(\\s*"+name+"\\s*\\)").test(content); }

function extractParams(sig: string): ParamInfo[] { const m=sig.match(/\(([^)]*)\)/); if (!m||!m[1].trim()) return []; return m[1].split(",").map((p:string)=>{const parts=p.trim().split(/:\s*/);return parts.length>=2?{name:parts[0].trim(),type:parts[1].trim()}:{name:parts[0].trim(),type:"any"}}); }
function extractPythonParams(p: string): ParamInfo[] { if (!p.trim()) return []; return p.split(",").map((s:string)=>{const t=s.trim();const ci=t.indexOf(":");const ei=t.indexOf("=");if(ci>=0){const n=t.substring(0,ci).trim();const r=t.substring(ci+1).trim();const er=r.indexOf("=");return er>=0?{name:n,type:r.substring(0,er).trim(),defaultValue:r.substring(er+1).trim()}:{name:n,type:r}}if(ei>=0)return{name:t.substring(0,ei).trim(),type:"any",defaultValue:t.substring(ei+1).trim()};return{name:t,type:"any"}}); }
function extractPythonReturn(lines: string[], dl: number): string { for (let i=dl+1;i<Math.min(dl+20,lines.length);i++) { const m=lines[i].trim().match(/^:returns?:\s*(.+)/); if (m) return m[1].trim(); } return ""; }
function extractGoParams(p: string): ParamInfo[] { if (!p.trim()) return []; return p.split(",").map((s:string)=>{const parts=s.trim().split(/\s+/);return parts.length>=2?{name:parts[0],type:parts.slice(1).join(" ")}:{name:parts[0],type:"any"}}); }
function extractRustParams(p: string): ParamInfo[] { if (!p.trim()) return []; const s=p.trim().replace(/^&?(?:mut\s+)?self\s*,?\s*/,""); if (!s) return []; return s.split(",").map((x:string)=>{const parts=x.trim().split(":");return parts.length>=2?{name:parts[0].trim(),type:parts.slice(1).join(":").trim()}:{name:parts[0].trim(),type:"any"}}); }
function extractRParams(p: string): ParamInfo[] { if (!p.trim()) return []; return p.split(",").map((s:string)=>{const t=s.trim();const ei=t.indexOf("=");return ei>=0?{name:t.substring(0,ei).trim(),type:"any",defaultValue:t.substring(ei+1).trim()}:{name:t,type:"any"}}); }

function extractDecorators(lines: string[], dl: number): string[] { const d:string[]=[]; for (let i=dl-1;i>=0;i--) { const l=lines[i].trim(); if (l.startsWith("@")) d.unshift(l); else if (!l) continue; else break; } return d; }
function extractPythonDecorators(lines: string[], dl: number): string[] { const d:string[]=[]; for (let i=dl-1;i>=0;i--) { const l=lines[i].trim(); if (l.startsWith("@")) d.unshift(l); else if (!l||l.startsWith("#")) continue; else break; } return d; }
function extractRustAttributes(lines: string[], dl: number): string[] { const d:string[]=[]; for (let i=dl-1;i>=0;i--) { const l=lines[i].trim(); if (l.startsWith("#[")) d.unshift(l); else if (!l) continue; else break; } return d; }

export function extractSymbols(file: SourceFile): CodeSymbol[] {
  let content: string; try { content = fs.readFileSync(file.path,"utf-8"); } catch { return []; }
  switch (file.language) { case "typescript":case "tsx":case "javascript":case "jsx": return extractTSJS(content,file.path,file.language); case "python": return extractPython(content,file.path,file.language); case "go": return extractGo(content,file.path,file.language); case "rust": return extractRust(content,file.path,file.language); case "r": return extractR(file); default: return []; }
}
