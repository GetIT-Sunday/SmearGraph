import type { MCPTool, MCPRequest, MCPResponse } from "../types/index.js";
import { readRequest, sendResponse, sendError } from "./transport.js";
import { handler as archHandler } from "./tools/architecture.js";
import { handler as compHandler } from "./tools/component.js";
import { handler as impactHandler } from "./tools/impact.js";
import { handler as traceHandler } from "./tools/trace.js";
import { handler as summaryHandler } from "./tools/summary.js";
import { handler as searchHandler } from "./tools/search.js";

const tools: MCPTool[] = [
  {
    name: "smeargraph_architecture",
    description: "Get full architecture overview: layers, components, dependency edges",
    inputSchema: { type: "object", properties: { depth: { type: "number", description: "Max edge traversal depth" } } },
    handler: archHandler,
  },
  {
    name: "smeargraph_component",
    description: "Get details about a specific component: dependencies, code, layer",
    inputSchema: { type: "object", properties: { name: { type: "string", description: "Component name (partial match)" } } },
    handler: compHandler,
  },
  {
    name: "smeargraph_impact",
    description: "Analyze what code is affected by changes to a file path",
    inputSchema: { type: "object", properties: {
      path: { type: "string", description: "File path to analyze" },
      depth: { type: "number", description: "Transitive traversal depth" },
    }},
    handler: impactHandler,
  },
  {
    name: "smeargraph_trace",
    description: "Query runtime trace results or function call chains",
    inputSchema: { type: "object", properties: {
      func: { type: "string", description: "Function name to trace" },
    }},
    handler: traceHandler,
  },
  {
    name: "smeargraph_summary",
    description: "Get plain-English summary and metadata for a node",
    inputSchema: { type: "object", properties: {
      nodeId: { type: "string", description: "Full node ID (e.g. component:src)" },
    }},
    handler: summaryHandler,
  },
  {
    name: "smeargraph_search",
    description: "Search for nodes by name, file path, or tags",
    inputSchema: { type: "object", properties: {
      query: { type: "string", description: "Search query" },
      type: { type: "string", description: "Filter by node type" },
    }},
    handler: searchHandler,
  },
];

const toolMap = new Map(tools.map(t => [t.name, t]));

export function listTools(): MCPTool[] { return tools; }
export function registerTool(tool: MCPTool): void {
  tools.push(tool);
  toolMap.set(tool.name, tool);
}

export async function handleRequest(req: MCPRequest): Promise<MCPResponse> {
  const { id, method, params } = req;
  try {
    if (method === "initialize") {
      return {
        jsonrpc: "2.0", id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "smeargraph", version: "1.0.0" },
        },
      };
    }
    if (method === "listTools") {
      return {
        jsonrpc: "2.0", id,
        result: { tools: tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) },
      };
    }
    if (method === "tools/call") {
      const p = params as { name?: string; arguments?: Record<string, unknown> } | undefined;
      if (!p?.name) return { jsonrpc: "2.0", id, error: { code: -32602, message: "Missing tool name" } };
      const tool = toolMap.get(p.name);
      if (!tool) return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown tool: ${p.name}` } };
      const result = await tool.handler(p.arguments || {});
      return { jsonrpc: "2.0", id, result };
    }
    return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { jsonrpc: "2.0", id, error: { code: -32603, message: `Internal error: ${msg}` } };
  }
}

export async function startServer(): Promise<void> {
  while (true) {
    const req = await readRequest();
    if (req === null) break;
    const res = await handleRequest(req);
    sendResponse(res);
  }
}
