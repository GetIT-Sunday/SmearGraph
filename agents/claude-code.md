# SmearGraph — Architecture Analysis

## Description

Analyze any codebase and generate ASCII architecture diagrams. Scans a project, extracts classes/functions with docstrings, groups them into components, and renders them as clean ASCII box diagrams. Also provides a **knowledge graph** and **MCP server** for AI agent integration.

## MCP Server Setup

SmearGraph exposes an MCP server (JSON-RPC 2.0 over stdin/stdout) for Claude Code. Add to your `claude.json`:

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

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `smeargraph_architecture` | Full architecture overview: layers, components, dependency edges |
| `smeargraph_component` | Details about a specific component: dependencies, code, layer |
| `smeargraph_impact` | Analyze what code is affected by changes to a file path |
| `smeargraph_trace` | Query runtime trace results or function call chains |
| `smeargraph_summary` | Plain-English summary and metadata for a node |
| `smeargraph_search` | Search for nodes by name, file path, or tags |

### Initialization

```bash
smeargraph init                    # Build knowledge graph
smeargraph serve                   # Start MCP server
export SMEARGRAPH_LLM_PROVIDER=anthropic
export SMEARGRAPH_LLM_API_KEY=sk-ant-...
smeargraph enrich                  # Enrich with LLM summaries
```

## CLI Instructions

### Step 1: Extract symbols
```bash
smeargraph analyze <project_dir> -f json -o /tmp/smeargraph_analysis.json
```

### Step 2: Read the JSON
Key fields:
- `symbols[].name` — class/function name
- `symbols[].kind` — class, function, method, interface
- `symbols[].docstring` — what it does
- `symbols[].filePath` — which file it's in

### Step 3: Group into Components
Each component should have:
- A descriptive name
- A one-sentence description
- 2-5 key responsibilities

### Step 4: Identify Data Flows
Between components, identify:
- Which calls which
- What data passes
- Direction: → forward, ← backward, ↔ bidirectional

### Step 5: Draw ASCII Diagram
```
─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ▶ ▼ ◀ ▲
```

Layout:
- Outer box = project name
- Main components horizontal, connected with `───▶`
- Support components below
- Details indented 2 spaces inside boxes

### Example Output
```
┌──────────────────────────────────────────┐
│              ProjectName                  │
│                                          │
│  ┌──────────────┐    ┌──────────────┐    │
│  │ Component A  │───▶│ Component B  │    │
│  │ - does X     │    │ - does Y     │    │
│  └──────────────┘    └──────────────┘    │
│                                          │
│  12 files · 3500 LOC · 68 symbols        │
└──────────────────────────────────────────┘
```

## Installation
```bash
npm install -g smeargraph
```
