# SmearGraph — Architecture Analysis Skill

## Description

Analyze any codebase and generate ASCII architecture diagrams. Extracts classes/functions with docstrings, groups into components, renders as clean box diagrams. Also provides a knowledge graph MCP server for AI agent integration.

## MCP Server

SmearGraph exposes an MCP server (JSON-RPC 2.0 over stdin/stdout). Configure in Codex:

```json
{
  "mcpServers": {
    "smeargraph": {
      "command": "npx",
      "args": ["smeargraph", "serve"]
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `smeargraph_architecture` | Full architecture: layers, components, dependency edges |
| `smeargraph_component` | Component details: dependencies, code snippet, layer |
| `smeargraph_impact` | Change impact analysis for a file path |
| `smeargraph_trace` | Runtime trace results or function call chains |
| `smeargraph_summary` | Plain-English summary and metadata for a node |
| `smeargraph_search` | Search nodes by name, file path, or tags |

## Trigger

- "analyze the architecture"
- "draw an architecture diagram"
- "understand this codebase"
- "what's the component structure"
- "what's the impact of changing X"

## Instructions

1. Run `smeargraph analyze <project_dir> -f json -o /tmp/smeargraph_analysis.json`
2. Read the JSON to understand symbols (name, kind, docstring, filePath)
3. Group symbols into logical components with descriptive names
4. Identify data flows between components (direction → ← ↔)
5. Draw ASCII diagram using `─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ▶ ▼ ◀ ▲`
6. Present the diagram to the user

For deep architecture queries, use MCP tools instead:
```
use_mcp_tool smeargraph smeargraph_architecture { "depth": 3 }
use_mcp_tool smeargraph smeargraph_component { "name": "Engine" }
use_mcp_tool smeargraph smeargraph_impact { "path": "src/core/engine.ts", "depth": 2 }
```

### Layout Rules
- Outer box = project name
- Main components horizontal left-to-right
- Support components below
- Details indented 2 spaces

### Example Output
```
┌──────────────────────────────────────────┐
│              ProjectName                  │
│  ┌──────────────┐    ┌──────────────┐    │
│  │ Component A  │───▶│ Component B  │    │
│  │ - does X     │    │ - does Y     │    │
│  └──────────────┘    └──────────────┘    │
│  12 files · 3500 LOC · 68 symbols        │
└──────────────────────────────────────────┘
```

## Installation
```bash
npm install -g smeargraph
```
