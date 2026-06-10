import type { MCPTool, MCPRequest, MCPResponse } from "../types/index.js";
import { readRequest, sendResponse, sendError } from "./transport.js";
import { SERVER_INSTRUCTIONS } from "./server-instructions.js";
import { handler as archHandler } from "./tools/architecture.js";
import { handler as compHandler } from "./tools/component.js";
import { handler as impactHandler } from "./tools/impact.js";
import { handler as traceHandler } from "./tools/trace.js";
import { handler as summaryHandler } from "./tools/summary.js";
import { handler as searchHandler } from "./tools/search.js";
import { handler as circularHandler } from "./tools/circular.js";
import { handler as deadHandler } from "./tools/dead.js";
import { handler as traverseHandler } from "./tools/traverse.js";
import { handler as exploreHandler } from "./tools/explore.js";
import { storeHandler, searchHandler as memorySearchHandler, listHandler as memoryListHandler, statsHandler as memoryStatsHandler } from "./tools/memory.js";
import { handler as prContextHandler } from "./tools/pr_context.js";

const tools: MCPTool[] = [
  {
    name: "smeargraph_explore",
    description: `PRIMARY TOOL — call FIRST for almost any question: how does X work,
architecture, a bug, where/what is X, or surveying an area. Returns the verbatim source
of the relevant symbols grouped by file in ONE capped call (Read-equivalent — do NOT
re-open shown files). Query can be a natural-language question OR a bag of symbol/file
names. Usually the ONLY call you need — answers without further search/node/Read/Grep.`,
    inputSchema: { type: "object", properties: {
      query: { type: "string", description: "Symbol names, file names, or short code terms to explore" },
      maxFiles: { type: "number", description: "Max files to return (default: 12)" },
    }},
    handler: exploreHandler,
  },
  {
    name: "smeargraph_architecture",
    description: `SECONDARY: Get full architecture overview — layers, components, dependency edges.
Use this for a high-level structural map of the entire project.
Returns components grouped by layer with their dependencies.
For specific symbol details, use smeargraph_component instead.`,
    inputSchema: { type: "object", properties: { depth: { type: "number", description: "Max edge traversal depth" } } },
    handler: archHandler,
  },
  {
    name: "smeargraph_component",
    description: `SECONDARY: Get details about a specific component — dependencies, code snippet, layer membership.
Use this when you know the component name and need its internals.
For symbol-level search, use smeargraph_search instead.`,
    inputSchema: { type: "object", properties: { name: { type: "string", description: "Component name (partial match)" } } },
    handler: compHandler,
  },
  {
    name: "smeargraph_impact",
    description: `SECONDARY: "What breaks if I change X?" — analyzes transitive dependents of a file or symbol.
Returns affected nodes grouped by layer with risk level (low/medium/high).
Use for refactor planning before editing code.`,
    inputSchema: { type: "object", properties: {
      path: { type: "string", description: "File path to analyze" },
      depth: { type: "number", description: "Transitive traversal depth" },
    }},
    handler: impactHandler,
  },
  {
    name: "smeargraph_callers",
    description: `SECONDARY: "What calls this?" — reverse call graph traversal from a symbol.
Returns all transitive callers up to maxDepth. Use for understanding usage patterns.`,
    inputSchema: { type: "object", properties: {
      symbol: { type: "string", description: "Symbol name to find callers of" },
      maxDepth: { type: "number", description: "Max traversal depth (default: 3)" },
    }},
    handler: async (args) => {
      const kg = (await import("./tools/traverse.js")).handler;
      return kg({ startId: args.symbol as string, direction: "incoming", maxDepth: args.maxDepth as number || 3 });
    },
  },
  {
    name: "smeargraph_callees",
    description: `SECONDARY: "What does this call?" — forward call graph traversal from a symbol.
Returns all transitive callees up to maxDepth. Use for understanding execution flow.`,
    inputSchema: { type: "object", properties: {
      symbol: { type: "string", description: "Symbol name to find callees of" },
      maxDepth: { type: "number", description: "Max traversal depth (default: 3)" },
    }},
    handler: async (args) => {
      const kg = (await import("./tools/traverse.js")).handler;
      return kg({ startId: args.symbol as string, direction: "outgoing", maxDepth: args.maxDepth as number || 3 });
    },
  },
  {
    name: "smeargraph_circular",
    description: `SECONDARY: "Are there circular dependencies?" — Tarjan SCC algorithm on the import graph.
Returns cycles grouped by size. Use for architecture quality assessment.`,
    inputSchema: { type: "object", properties: {} },
    handler: circularHandler,
  },
  {
    name: "smeargraph_dead",
    description: `SECONDARY: "Is there dead code?" — finds exported symbols with no incoming references.
Returns dead symbols grouped by file. Use for cleanup planning.`,
    inputSchema: { type: "object", properties: {
      includeUnexported: { type: "boolean", description: "Include non-exported symbols (default: false)" },
      limit: { type: "number", description: "Max dead files to return (default: 50)" },
    }},
    handler: deadHandler,
  },
  {
    name: "smeargraph_trace",
    description: `SECONDARY: Query runtime trace results or function call chains (Python only).
Use this after running 'smeargraph trace --cmd' to see actual execution flow.
Returns call graph from runtime instrumentation, not static analysis.`,
    inputSchema: { type: "object", properties: {
      func: { type: "string", description: "Function name to trace" },
    }},
    handler: traceHandler,
  },
  {
    name: "smeargraph_summary",
    description: `SECONDARY: Get plain-English summary and metadata for a node.
Use this for a quick description of what a symbol does.
Returns LLM-enriched summary if available, otherwise heuristic summary.`,
    inputSchema: { type: "object", properties: {
      nodeId: { type: "string", description: "Full node ID (e.g. component:src)" },
    }},
    handler: summaryHandler,
  },
  {
    name: "smeargraph_search",
    description: `SECONDARY: Search for nodes by name, file path, or tags.
Use this when you know a symbol name and need its location.
FASTER than grep for symbol lookup — do NOT grep first.
Returns matching nodes with their type and file path.`,
    inputSchema: { type: "object", properties: {
      query: { type: "string", description: "Search query" },
      type: { type: "string", description: "Filter by node type" },
    }},
    handler: searchHandler,
  },
  {
    name: "smeargraph_traverse",
    description: `SECONDARY: Generic BFS/DFS traversal from a node with edge-type and depth filters.
Use this for custom graph exploration when other tools don't fit.
Returns visited nodes with their depth from start.`,
    inputSchema: { type: "object", properties: {
      startId: { type: "string", description: "Node ID to start traversal from" },
      direction: { type: "string", description: "incoming | outgoing | both (default: both)" },
      maxDepth: { type: "number", description: "Max traversal depth (default: 3)" },
      edgeTypes: { type: "array", items: { type: "string" }, description: "Filter by edge types" },
      nodeTypes: { type: "array", items: { type: "string" }, description: "Filter by node types" },
      limit: { type: "number", description: "Max results (default: 100)" },
    }},
    handler: traverseHandler,
  },
  {
    name: "smeargraph_status",
    description: `META: Check if the SmearGraph index is ready, its size, and pending sync files.
Use this to verify the index is current before relying on query results.`,
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const root = process.env.SMEARGRAPH_PROJECT_ROOT || process.cwd();
      const fs = await import("fs");
      const path = await import("path");
      const kgPath = path.join(root, ".smeargraph", "knowledge-graph.json");
      try {
        const stat = fs.statSync(kgPath);
        const kg = JSON.parse(fs.readFileSync(kgPath, "utf-8"));
        return {
          ready: true,
          lastModified: stat.mtime.toISOString(),
          nodeCount: kg.nodes?.length || 0,
          edgeCount: kg.edges?.length || 0,
          layerCount: kg.layers?.length || 0,
        };
      } catch {
        return { ready: false, message: "No knowledge graph found. Run 'smeargraph init' first." };
      }
    },
  },
  {
    name: "smeargraph_memory_store",
    description: `Store a memory entry for cross-session persistence.
Use this to remember decisions, insights, patterns, or issues.`,
    inputSchema: { type: "object", properties: {
      kind: { type: "string", description: "Type: decision | insight | pattern | issue" },
      title: { type: "string", description: "Short title" },
      content: { type: "string", description: "Full content" },
      tags: { type: "array", items: { type: "string" }, description: "Tags for search" },
    }},
    handler: storeHandler,
  },
  {
    name: "smeargraph_memory_search",
    description: `Search memories by keyword.
Returns matching memories with relevance scoring.`,
    inputSchema: { type: "object", properties: {
      query: { type: "string", description: "Search query" },
      limit: { type: "number", description: "Max results (default: 20)" },
    }},
    handler: memorySearchHandler,
  },
  {
    name: "smeargraph_memory_list",
    description: `List recent memories, optionally filtered by kind.`,
    inputSchema: { type: "object", properties: {
      kind: { type: "string", description: "Filter by kind: decision | insight | pattern | issue" },
      limit: { type: "number", description: "Max results (default: 50)" },
    }},
    handler: memoryListHandler,
  },
  {
    name: "smeargraph_memory_stats",
    description: `Get memory store statistics.`,
    inputSchema: { type: "object", properties: {} },
    handler: memoryStatsHandler,
  },
  {
    name: "smeargraph_pr_context",
    description: `Analyze git diff and show impact on the codebase.
Use this for PR review — shows changed files, affected nodes, and risk level.`,
    inputSchema: { type: "object", properties: {
      depth: { type: "number", description: "Transitive traversal depth (default: 2)" },
    }},
    handler: prContextHandler,
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
          instructions: SERVER_INSTRUCTIONS,
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
