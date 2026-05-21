<h1 align="center">
  🎨 SmearGraph
</h1>

<p align="center">
  <b>Paint code architecture like Smeargle.</b><br />
  Scan source → extract symbols → render ASCII diagrams.
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/smeargraph" alt="npm version" />
  <img src="https://img.shields.io/npm/l/smeargraph" alt="license" />
  <img src="https://img.shields.io/github/stars/GetIT-Sunday/SmearGraph?style=social" alt="stars" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs welcome" />
</p>

---

SmearGraph reads your source code and draws its architecture — as clean ASCII box diagrams you can paste anywhere: READMEs, docs, PRs, terminals.

```bash
npm install -g smeargraph
smeargraph analyze ./your-project
```

```
  Analyzed 966 files · 172,644 LOC · 4,960 symbols

┌──────────────────────────────────────────────────────────────┐
│                          BioGSP                               │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │SGWT Init     │   │Graph Builder │   │Wavelet Engine│      │
│  │initSGWT()    │──▶│runSpecGraph()│◀──│sgwt_kernels()│      │
│  │- 创建SGWT对象 │   │- k-NN邻接图  │   │- MexicanHat  │      │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘      │
│         │                  │                  │               │
│         ▼                  ▼                  ▼               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              SGWT Transformer                        │     │
│  │  sgwt_forward() → sgwt_inverse() → runSGCC()        │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  R package · 12 files · 3,576 LOC · 68 symbols               │
└──────────────────────────────────────────────────────────────┘
```

## Why SmearGraph?

- 🎨 **ASCII-first**: Output is plain text. Paste into GitHub, Notion, Slack, or `cat` it in your terminal.
- ⚡ **Zero config**: Point at a directory. No YAML, no setup, no API keys.
- 🤖 **AI agent ready**: Built-in configs for OpenCode, Claude Code, and Codex.
- 🌍 **14 languages**: TypeScript, Python, Go, Rust, R, Java, Swift, Kotlin, C#, C/C++, Scala, Elixir, Lua.
- 📦 **Tiny**: 23 kB. One dependency. Installs in under a second.

## Quick Start

```bash
npm install -g smeargraph

# ASCII diagram to terminal
smeargraph analyze

# JSON for scripts / AI agents
smeargraph analyze . -f json -o analysis.json

# Save diagram to file
smeargraph analyze ~/projects/my-app -f ascii -o architecture.txt
```

## How It Works

```
Source Code                    smeargraph                    Output
───────────                    ──────────                    ──────
                                                             
  src/                        1. Scanner                     ┌──────────────┐
  ├── parser.ts                Walks directory tree,         │ ASCII Box    │
  ├── scanner.ts               detects language by           │ Diagram      │
  └── index.ts                 extension (.ts→TS, .py→Py)    │              │
                                                             │ or           │
                              2. Parser                       │              │
                               Extracts classes, functions,  │ JSON         │
                               methods, docstrings, params   │ (symbols[])  │
                                                             └──────────────┘
                              3. Renderer
                               Groups into components,
                               draws boxes and arrows
```

1. **Scan** — Walks directories, identifies 14 languages by extension
2. **Extract** — Parses source code, pulls every class/function/method with docstrings
3. **Output** — ASCII diagram, Mermaid class diagram, or structured JSON

## Installation

```bash
# npm (recommended)
npm install -g smeargraph

# From source
git clone https://github.com/GetIT-Sunday/SmearGraph.git
cd SmearGraph
npm install && npm run build && npm link
```

## Usage

### Basic

```bash
smeargraph analyze                          # current directory
smeargraph analyze ~/projects/my-app        # specific path
smeargraph analyze . -d 3                   # limit depth
smeargraph analyze . -e "tests,docs,vendor" # exclude patterns
```

### Output Formats

```bash
smeargraph analyze -f ascii                 # ASCII diagram (default)
smeargraph analyze -f json                  # JSON for AI agents / scripts
smeargraph analyze -f json -o data.json     # save to file
```

### JSON Output

```json
{
  "projectName": "my-app",
  "stats": { "totalFiles": 42, "totalLOC": 8520, "totalSymbols": 156 },
  "symbols": [
    {
      "name": "BackboneLoader",
      "kind": "class",
      "docstring": "Load .hdf5 backbone models and extract embeddings",
      "filePath": "src/models/loader.py",
      "params": [{"name": "model_path", "type": "str"}],
      "decorators": ["@dataclass"]
    }
  ]
}
```

## Supported Languages

| Language | Extensions | Extracts |
|----------|-----------|----------|
| TypeScript / JavaScript | `.ts` `.tsx` `.js` `.jsx` | class, interface, type, enum, function, method, decorators, JSDoc |
| Python | `.py` | class, function, decorators, `:param`/`:return` docstring |
| Go | `.go` | struct, interface, func, method (receiver), exported detection |
| Rust | `.rs` | struct, enum, trait, fn, method, `#[derive]` attributes |
| R | `.r` `.R` `.Rmd` | function, S4 class, R6 class, roxygen `#' @description` |
| Java | `.java` | class, interface, method |
| Kotlin | `.kt` `.kts` | class, function |
| Swift | `.swift` | class, struct, func |
| C# | `.cs` | class, interface, method |
| C / C++ | `.c` `.cpp` `.h` `.hpp` | function, struct |
| Scala | `.scala` | class, object, def |
| Elixir | `.ex` `.exs` | defmodule, def |
| Lua | `.lua` | function |

## AI Agent Integration

SmearGraph ships with configs for popular AI coding agents. Each teaches the agent how to use SmearGraph to analyze codebases.

| Platform | Config | Setup |
|----------|--------|-------|
| **OpenCode** | [`agents/opencode.md`](agents/opencode.md) | Copy to `.opencode/agents/` |
| **Claude Code** | [`agents/claude-code.md`](agents/claude-code.md) | Copy to `.claude/` as slash command |
| **Codex (OpenAI)** | [`agents/codex.md`](agents/codex.md) | Import as custom skill |

**Agent workflow:** Run CLI → read JSON → group symbols into components → trace data flows → render ASCII diagram.

## vs Alternatives

| | SmearGraph | ast-grep | dependency-cruiser |
|---|---|---|---|
| Output | **ASCII + JSON** | AST matches | DOT / HTML |
| Setup | `npm i -g` | `npm i -g` | config file |
| Size | 23 kB | 15 MB | 8 MB |
| Docstring extraction | ✅ | ❌ | ❌ |
| AI agent configs | ✅ OpenCode/Claude/Codex | ❌ | ❌ |
| Best for | Architecture docs | Code search/lint | Dependency graphs |

## Contributing

Issues and PRs welcome. See the [open issues](https://github.com/GetIT-Sunday/SmearGraph/issues) for ideas.

```bash
git clone https://github.com/GetIT-Sunday/SmearGraph.git
cd SmearGraph
npm install
npm run dev     # tsx src/cli.ts
npm run build   # tsc
```

## License

MIT © [GetIT-Sunday](https://github.com/GetIT-Sunday)

---

<p align="center">
  <sub>Named after <a href="https://bulbapedia.bulbagarden.net/wiki/Smeargle_(Pok%C3%A9mon)">Smeargle</a>, the Painting Pokémon — it walks through your codebase and paints its architecture with its tail.</sub>
</p>
