import type { MCPRequest, MCPResponse } from "../types/index.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function readLine(): Promise<string | null> {
  return new Promise((resolve) => {
    const onReadable = () => {
      let line = "";
      let char: string | undefined;
      while (undefined !== (char = process.stdin.read(1)?.toString())) {
        if (char === "\n") { resolve(line); return; }
        line += char;
      }
      if (line.length > 0) { resolve(line); return; }
      resolve(null);
    };
    if (process.stdin.readableLength > 0) { onReadable(); return; }
    process.stdin.once("readable", onReadable);
  });
}

export async function readRequest(): Promise<MCPRequest | null> {
  const line = await readLine();
  if (line === null) return null;
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as MCPRequest;
  } catch {
    return {
      jsonrpc: "2.0",
      id: 0,
      method: "",
      params: {},
    };
  }
}

export function sendResponse(res: MCPResponse): void {
  const json = JSON.stringify(res);
  process.stdout.write(json + "\n");
}

export function sendError(id: number | string | null, code: number, message: string, data?: unknown): void {
  sendResponse({ jsonrpc: "2.0", id: id ?? 0, error: { code, message, data } });
}
