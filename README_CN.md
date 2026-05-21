# SmearGraph 🗺️

> 分析任意代码库，生成精美的 ASCII 架构图。

SmearGraph 扫描你的项目，提取每个类、函数和方法（含文档注释），然后帮你理解架构——通过原始 JSON 或干净的 ASCII 框图。

## 快速开始

```bash
npm install -g smeargraph
smeargraph analyze ./my-project
```

**就这么简单。**终端直接输出 ASCII 架构图。

## 功能

- **多语言支持**：TypeScript、JavaScript、Python、Go、Rust、R、Java、Swift、Kotlin、C# 等
- **符号提取**：类、函数、方法、接口、枚举——含文档注释和参数信息
- **两种输出模式**：
  - `-f ascii` — ASCII 框图（默认）
  - `-f json` — 结构化 JSON，供程序化使用 / AI Agent 消费
- **零配置**：合理的默认值，排除模式，深度控制
- **AI Agent 就绪**：内置 OpenCode、Claude Code、Codex 配置

## 用法

```bash
# 分析当前目录，输出 ASCII 图
smeargraph analyze

# 分析指定项目
smeargraph analyze ~/projects/my-app

# 输出 JSON 给 AI Agent 使用
smeargraph analyze . -f json -o analysis.json

# 保存 ASCII 图到文件
smeargraph analyze . -f ascii -o architecture.txt

# 排除目录
smeargraph analyze . -e "node_modules,dist,tests,docs"

# 限制扫描深度
smeargraph analyze . -d 3
```

## 支持的语言

| 语言 | 扩展名 | 提取内容 |
|------|--------|----------|
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

## AI Agent 集成

SmearGraph 专为 AI 编程 Agent 设计。每个平台只需一份薄配置：

| 平台 | 配置文件 | 使用方式 |
|------|---------|----------|
| **OpenCode** | `agents/opencode.md` | 复制到 `.opencode/agents/` |
| **Claude Code** | `agents/claude-code.md` | 复制到 `.claude/` 作为 slash command |
| **Codex (OpenAI)** | `agents/codex.md` | 作为自定义 skill 导入 |

Agent 工作流：
1. 运行 `smeargraph analyze <project> -f json` 提取符号
2. 读取 JSON 理解类、函数及其文档
3. 将符号分组为逻辑组件
4. 追踪组件间的数据流
5. 渲染为 ASCII 架构图

## 从源码安装

```bash
git clone https://github.com/GetIT-Sunday/SmearGraph.git
cd smeargraph
npm install
npm run build
npm link  # 全局可用
```

## License

MIT © [GetIT-Sunday](https://github.com/GetIT-Sunday)
