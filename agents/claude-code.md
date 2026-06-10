# SmearGraph — Code Architecture Analysis

## MCP Server Setup

Add to your `claude.json`:

```json
{
  "mcpServers": {
    "smeargraph": {
      "command": "npx",
      "args": ["smeargraph", "serve"],
      "timeout": 300000
    }
  }
}
```

## Initialization

```bash
smeargraph init                    # Build knowledge graph + SQLite index
smeargraph serve                   # Start MCP server (optional, Claude Code starts it)
smeargraph enrich                  # Optional: enrich with LLM summaries
```

## Available Tools (18 total)

### PRIMARY Tool
| Tool | Purpose |
|------|---------|
| `smeargraph_explore` | **Call FIRST** for any code question — returns verbatim source |

### Code Analysis
| Tool | Purpose |
|------|---------|
| `smeargraph_search` | Find symbol by name (faster than grep) |
| `smeargraph_impact` | "What breaks if I change X?" |
| `smeargraph_callers` | "What calls this?" |
| `smeargraph_callees` | "What does this call?" |
| `smeargraph_traverse` | Generic graph traversal with filters |
| `smeargraph_circular` | Find circular dependencies |
| `smeargraph_dead` | Find dead code |
| `smeargraph_pr_context` | Analyze git diff impact |

### Architecture
| Tool | Purpose |
|------|---------|
| `smeargraph_architecture` | Full architecture overview |
| `smeargraph_component` | Component details |
| `smeargraph_trace` | Runtime trace (Python only) |
| `smeargraph_summary` | Node summary |

### Memory (Cross-Session)
| Tool | Purpose |
|------|---------|
| `smeargraph_memory_store` | Store decision/insight/pattern |
| `smeargraph_memory_search` | Search memories |
| `smeargraph_memory_list` | List memories |
| `smeargraph_memory_stats` | Memory statistics |

### Meta
| Tool | Purpose |
|------|---------|
| `smeargraph_status` | Check index health |

## Tool Selection Guide

**Almost any question** → `smeargraph_explore` (PRIMARY — call FIRST)

**"What calls this?"** → `smeargraph_callers`

**"What breaks if I change X?"** → `smeargraph_impact`

**"Are there circular deps?"** → `smeargraph_circular`

**"Is there dead code?"** → `smeargraph_dead`

**"What changed in this PR?"** → `smeargraph_pr_context`

## CLI Fallback (no MCP)

```bash
smeargraph analyze <dir> -f ascii     # ASCII architecture diagram
smeargraph analyze <dir> -f html      # Interactive HTML dashboard
smeargraph analyze <dir> -f json      # JSON export
```
