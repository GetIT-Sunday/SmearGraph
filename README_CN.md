<h1 align="center">
  🎨 SmearGraph
</h1>

<p align="center">
  <b>像图图犬一样，画出代码的架构。</b><br />
  扫描源码 → 提取符号 → 渲染 ASCII 图。
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/smeargraph" alt="npm version" />
  <img src="https://img.shields.io/npm/l/smeargraph" alt="license" />
  <img src="https://img.shields.io/github/stars/GetIT-Sunday/SmearGraph?style=social" alt="stars" />
</p>

---

SmearGraph 读取你的源码，画出它的架构——生成可以粘贴到任何地方的 ASCII 框图：README、文档、PR、终端。

```bash
npm install -g smeargraph
smeargraph analyze ./your-project
```

## 为什么用 SmearGraph？

- 🎨 **纯文本输出**：ASCII 图可以直接粘贴到 GitHub、Notion、Slack，或终端 `cat` 查看。
- ⚡ **零配置**：指向目录即可运行。不需要 YAML 配置，不需要 API key。
- 🤖 **AI Agent 就绪**：内置 OpenCode、Claude Code、Codex 的 Agent 配置。
- 🌍 **14 种语言**：TypeScript、Python、Go、Rust、R、Java、Swift、Kotlin、C#、C/C++、Scala、Elixir、Lua。
- 📦 **极轻量**：23 kB。只有 1 个依赖。1 秒内安装完成。

## 快速开始

```bash
npm install -g smeargraph

# 输出 ASCII 架构图到终端
smeargraph analyze

# 输出 JSON 给脚本或 AI Agent 使用
smeargraph analyze . -f json -o analysis.json

# 保存架构图到文件
smeargraph analyze ~/projects/my-app -f ascii -o architecture.txt
```

## 工作原理

1. **扫描** — 遍历目录，按扩展名识别 14 种语言
2. **提取** — 解析源码，提取每个类/函数/方法及其文档注释
3. **输出** — ASCII 框图（默认）或结构化 JSON

## 安装

```bash
# npm（推荐）
npm install -g smeargraph

# 从源码安装
git clone https://github.com/GetIT-Sunday/SmearGraph.git
cd SmearGraph
npm install && npm run build && npm link
```

## 用法

```bash
smeargraph analyze                          # 当前目录
smeargraph analyze ~/projects/my-app        # 指定路径
smeargraph analyze . -d 3                   # 限制深度
smeargraph analyze . -e "tests,docs,vendor" # 排除目录

smeargraph analyze -f ascii                 # ASCII 图（默认）
smeargraph analyze -f json                  # JSON（供 AI Agent 使用）
smeargraph analyze -f json -o data.json     # 保存到文件
```

## 支持的语言

| 语言 | 扩展名 | 提取内容 |
|------|--------|----------|
| TypeScript / JavaScript | `.ts` `.tsx` `.js` `.jsx` | class, interface, type, enum, function, method, decorators, JSDoc |
| Python | `.py` | class, function, decorators, `:param`/`:return` 文档 |
| Go | `.go` | struct, interface, func, method (receiver) |
| Rust | `.rs` | struct, enum, trait, fn, method, `#[derive]` |
| R | `.r` `.R` `.Rmd` | function, S4 class, R6 class, roxygen `#'` 文档 |
| Java | `.java` | class, interface, method |
| Kotlin | `.kt` `.kts` | class, function |
| Swift | `.swift` | class, struct, func |
| C# | `.cs` | class, interface, method |
| C / C++ | `.c` `.cpp` `.h` `.hpp` | function, struct |
| Scala | `.scala` | class, object, def |
| Elixir | `.ex` `.exs` | defmodule, def |
| Lua | `.lua` | function |

## AI Agent 集成

SmearGraph 自带主流 AI 编程 Agent 的配置文件：

| 平台 | 配置 | 使用方式 |
|------|------|----------|
| **OpenCode** | `agents/opencode.md` | 复制到 `.opencode/agents/` |
| **Claude Code** | `agents/claude-code.md` | 复制到 `.claude/` |
| **Codex (OpenAI)** | `agents/codex.md` | 作为自定义 skill 导入 |

**Agent 工作流：** 运行 CLI → 读取 JSON → 分组为组件 → 追踪数据流 → 渲染 ASCII 图。

## 参与贡献

欢迎提 Issue 和 PR。

```bash
git clone https://github.com/GetIT-Sunday/SmearGraph.git
cd SmearGraph
npm install
npm run dev     # tsx src/cli.ts
npm run build   # tsc
```

## 许可证

MIT © [GetIT-Sunday](https://github.com/GetIT-Sunday)

---

<p align="center">
  <sub>命名自宝可梦 <a href="https://wiki.52poke.com/wiki/图图犬">图图犬 (Smeargle)</a>——它用尾巴在你的代码库里画出架构图。</sub>
</p>
