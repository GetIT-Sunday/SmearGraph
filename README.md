# SmearGraph 🗺️

> Analyze any codebase and generate beautiful ASCII architecture diagrams.

SmearGraph scans your project, extracts every class, function, and method (with docstrings), then helps you understand the architecture — either via raw JSON or clean ASCII box diagrams.

## Quick Start

```bash
npm install -g smeargraph
smeargraph analyze ./my-project
```

**That's it.** You get an ASCII architecture diagram printed to your terminal.

## Features

- **Multi-language**: TypeScript, JavaScript, Python, Go, Rust, R, Java, Swift, Kotlin, C#, and more
- **Symbol extraction**: Classes, functions, methods, interfaces, enums — with docstrings and parameters
- **Two output modes**:
  - `-f ascii` — Clean ASCII box diagram (default)
  - `-f json` — Structured JSON for programmatic use / AI agents
- **Zero-config**: reasonable defaults, exclude patterns, depth control
- **AI Agent ready**: includes configs for OpenCode, Claude Code, and Codex

## Usage

```bash
# Analyze current directory, print ASCII diagram
smeargraph analyze

# Analyze a specific project
smeargraph analyze ~/projects/my-app

# Output JSON for AI agents / programmatic use
smeargraph analyze . -f json -o analysis.json

# Save ASCII diagram to file
smeargraph analyze . -f ascii -o architecture.txt

# Exclude patterns
smeargraph analyze . -e "node_modules,dist,tests,docs"

# Limit depth
smeargraph analyze . -d 3
```

### Output Example

```
┌──────────────────────────────────────────────────────────────┐
│                   PragmaticTransferPipeline                   │
│                                                              │
│  ┌─────────────────┐    ┌────────────────────────────────┐   │
│  │ BackboneLoader  │    │  MLPHead                       │   │
│  │                 │    │                                │   │
│  │  Load .hdf5     │───▶│  Dense(emb_dim → 512) + ReLU   │   │
│  │  Freeze params  │    │  + Dropout(0.3)               │   │
│  └─────────────────┘    └──────────────┬─────────────────┘   │
│                                        ▼                     │
│                              ┌──────────────────────┐        │
│                              │  PragmaticExplainer  │        │
│                              │  SHAP DeepExplainer  │        │
│                              └──────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

## Supported Languages

| Language | Extensions | Extracts |
|----------|-----------|----------|
| TypeScript/JS | `.ts` `.tsx` `.js` `.jsx` | class, interface, type, enum, function, method, decorators, JSDoc |
| Python | `.py` | class, function, decorators, docstring, `:param`/`:return` |
| Go | `.go` | struct, interface, func, method (receiver) |
| Rust | `.rs` | struct, enum, trait, fn, method, `#[derive]` |
| R | `.r` `.R` `.Rmd` | function, S4 class, roxygen `#' @description` |
| Java | `.java` | class, interface, method |
| Kotlin | `.kt` `.kts` | class, function |
| Swift | `.swift` | class, struct, func |
| C# | `.cs` | class, interface, method |
| C/C++ | `.c` `.cpp` `.h` `.hpp` | function, struct |
| Scala | `.scala` | class, object, def |
| Elixir | `.ex` `.exs` | defmodule, def |
| Lua | `.lua` | function |

## AI Agent Integration

SmearGraph is designed to work with AI coding agents. Each platform needs a thin config:

| Platform | Config File | How to Use |
|----------|------------|------------|
| **OpenCode** | `agents/opencode.md` | Copy to `.opencode/agents/` |
| **Claude Code** | `agents/claude-code.md` | Copy to `.claude/` as slash command |
| **Codex (OpenAI)** | `agents/codex.md` | Import as custom skill |

The agent workflow:
1. Run `smeargraph analyze <project> -f json` to extract symbols
2. Read the JSON to understand classes, functions, and their docstrings
3. Group symbols into logical components
4. Trace data flows between components
5. Render as ASCII architecture diagram

## Install from Source

```bash
git clone https://github.com/GetIT-Sunday/SmearGraph.git
cd smeargraph
npm install
npm run build
npm link  # makes 'smeargraph' available globally
```

## License

MIT © [GetIT-Sunday](https://github.com/GetIT-Sunday)
